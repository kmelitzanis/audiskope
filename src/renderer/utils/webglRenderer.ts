import { SpectrumView } from './spectrumView';
// WebGL Spectrogram Renderer - GPU-accelerated spectrum visualization
export class WebGLSpectrogramRenderer {
    private gl: WebGLRenderingContext;
    private program: WebGLProgram | null = null;
    private texture: WebGLTexture | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private colorSchemeLocation: WebGLUniformLocation | null = null;
    private initialized = false;
    private bins = 1;
    private frames = 1;
    constructor(private canvas: HTMLCanvasElement) {
        const gl = canvas.getContext('webgl', {
            antialias: false,
            preserveDrawingBuffer: true,
            alpha: false
        });
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this.gl = gl;
        this.init();
    }
    private init(): void {
        const gl = this.gl;
        // Vertex shader
        const vsSource = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vTexCoord;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = aTexCoord;
      }
    `;
        // Fragment shader with color schemes
        const fsSource = `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform int uColorScheme;
      uniform float uSampleRate;
      uniform vec4 uView;
      uniform int uLog;
      uniform float uBins;
      uniform float uMaxFrequency;
      uniform float uTimeRatio;
      uniform float uDuration;
      uniform float uFrames;

      vec3 seratoColor(float v) {
        if (v < 0.1667) return mix(vec3(0.), vec3(.153,0.,.502), v * 6.);
        if (v < 0.3333) return mix(vec3(.153,0.,.502), vec3(0.,.29,1.), (v-.1667)*6.);
        if (v < 0.5) return mix(vec3(0.,.29,1.), vec3(0.,.831,.863), (v-.3333)*6.);
        if (v < 0.6667) return mix(vec3(0.,.831,.863), vec3(.451,.937,.22), (v-.5)*6.);
        if (v < 0.8333) return mix(vec3(.451,.937,.22), vec3(1.,.941,.173), (v-.6667)*6.);
        return mix(vec3(1.,.941,.173), vec3(1.,.294,.094), (v-.8333)*6.);
      }

      vec3 fireColor(float v) {
        if (v < 0.25) return vec3(v * 4.0 * 0.4, 0.0, 0.0);
        if (v < 0.5) return vec3(0.4 + (v - 0.25) * 2.4, (v - 0.25) * 1.2, 0.0);
        if (v < 0.75) return vec3(1.0, 0.3 + (v - 0.5) * 2.8, 0.0);
        return vec3(1.0, 1.0, (v - 0.75) * 4.0);
      }

      vec3 iceColor(float v) {
        if (v < 0.33) return vec3(0.0, 0.0, v * 3.0 * 0.5);
        if (v < 0.66) return vec3(0.0, (v - 0.33) * 3.0 * 0.8, 0.5 + (v - 0.33) * 1.5);
        return vec3((v - 0.66) * 3.0, 0.8 + (v - 0.66) * 0.6, 1.0);
      }

      vec3 monoColor(float v) {
        return vec3(v);
      }

      void main() {
        float y = mix(uView.z, uView.w, vTexCoord.y);
        float frequency = uLog == 1 ? 20.0 * pow(uMaxFrequency / 20.0, 1.0 - y)
          : (1.0 - y) * uMaxFrequency;
        float time = mix(uView.x, uView.y, vTexCoord.x) * uTimeRatio;
        if(time > 1.0 || frequency > uSampleRate * 0.5){gl_FragColor=vec4(0.,0.,0.,1.);return;}
        float bin = min(uBins - 1.0, frequency / (uSampleRate * 0.5) * uBins);
        float windowSeconds = 2.0 * uBins / uSampleRate;
        float frameFraction = uDuration > windowSeconds ? clamp((time * uDuration - windowSeconds * 0.5) / (uDuration - windowSeconds), 0.0, 1.0) : 0.0;
        vec2 uv=vec2((frameFraction*(uFrames-1.0)+0.5)/uFrames,(uBins-bin-0.5)/uBins);
        vec4 texel=texture2D(uTexture,uv);
        float value=(texel.r*256.0+texel.a)/257.0;
        vec3 color;

        if (uColorScheme == 0) color = seratoColor(value);
        else if (uColorScheme == 1) color = fireColor(value);
        else if (uColorScheme == 2) color = iceColor(value);
        else if (uColorScheme == 4) {
          if(value<0.55) color=mix(vec3(0.005,0.012,0.025),vec3(0.10,0.43,0.88),pow(value/0.55,1.8));
          else if(value<0.84) color=mix(vec3(0.10,0.43,0.88),vec3(1.0,0.56,0.07),smoothstep(0.55,0.84,value));
          else color=mix(vec3(1.0,0.56,0.07),vec3(1.0,0.97,0.90),smoothstep(0.84,1.0,value));
        }
        else color = monoColor(value);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
        // Compile shaders
        const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) {
            throw new Error('Shader compilation failed');
        }
        // Create program
        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
        }
        this.program = program;
        this.colorSchemeLocation = gl.getUniformLocation(program, 'uColorScheme');
        // Create buffers
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        // Create texture
        this.texture = gl.createTexture();
        this.initialized = true;
    }
    private compileShader(type: number, source: string): WebGLShader | null {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader)
            return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    resize(): void {
        const { width, height } = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    setData(frames: Float32Array[], numFrames: number, bufferLength: number): void {
        if (!this.initialized)
            return;
        const gl = this.gl;
        this.bins = bufferLength;
        this.frames = numFrames;
        const data = new Uint8Array(numFrames * bufferLength * 2);
        for (let i = 0; i < frames.length && i < numFrames; i++) {
            const frame = frames[i];
            for (let j = 0; j < bufferLength && j < frame.length; j++) {
                const value = Math.round(Math.min(1, Math.max(0, frame[j])) * 65535);
                const offset = (i + (bufferLength - 1 - j) * numFrames) * 2;
                data[offset] = value >> 8;
                data[offset + 1] = value & 255;
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, numFrames, bufferLength, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    render(colorScheme: number, sampleRate: number, view: SpectrumView, logarithmic: boolean, maxFrequency = sampleRate / 2, timeRatio = 1, duration = 1): void {
        if (!this.initialized || !this.program)
            return;
        const gl = this.gl;
        gl.clearColor(0.05, 0.05, 0.05, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.uniform1i(this.colorSchemeLocation, colorScheme);
        gl.uniform1f(gl.getUniformLocation(this.program, 'uSampleRate'), sampleRate);
        gl.uniform4f(gl.getUniformLocation(this.program, 'uView'), view.x0, view.x1, view.y0, view.y1);
        gl.uniform1i(gl.getUniformLocation(this.program, 'uLog'), logarithmic ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(this.program, 'uBins'), this.bins);
        gl.uniform1f(gl.getUniformLocation(this.program, 'uMaxFrequency'), maxFrequency);
        gl.uniform1f(gl.getUniformLocation(this.program, 'uTimeRatio'), timeRatio);
        gl.uniform1f(gl.getUniformLocation(this.program, 'uDuration'), duration);
        gl.uniform1f(gl.getUniformLocation(this.program, 'uFrames'), this.frames);
        // Position attribute
        const posLoc = gl.getAttribLocation(this.program, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        // TexCoord attribute
        const texLoc = gl.getAttribLocation(this.program, 'aTexCoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
        // Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(gl.getUniformLocation(this.program, 'uTexture'), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    destroy(): void {
        const gl = this.gl;
        if (this.program)
            gl.deleteProgram(this.program);
        if (this.texture)
            gl.deleteTexture(this.texture);
        if (this.positionBuffer)
            gl.deleteBuffer(this.positionBuffer);
        if (this.texCoordBuffer)
            gl.deleteBuffer(this.texCoordBuffer);
    }
}
