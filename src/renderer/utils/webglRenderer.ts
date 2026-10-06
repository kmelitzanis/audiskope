import { SpectrumView } from './spectrumView';
const UNIFORMS = ['uTexture', 'uColorScheme', 'uSampleRate', 'uView', 'uBins', 'uMaxFrequency', 'uTimeRatio', 'uDuration', 'uFrames'] as const;
type UniformName = typeof UNIFORMS[number];
// WebGL Spectrogram Renderer - GPU-accelerated spectrum visualization
export class WebGLSpectrogramRenderer {
    private gl: WebGLRenderingContext;
    private program: WebGLProgram | null = null;
    private texture: WebGLTexture | null = null;
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;
    private uniforms = {} as Record<UniformName, WebGLUniformLocation | null>;
    private positionLocation = -1;
    private texCoordLocation = -1;
    private initialized = false;
    private bins = 1;
    private frames = 1;
    private data: { frames: Float32Array[]; numFrames: number; bufferLength: number } | null = null;
    /** `onRestored` runs after a lost context is rebuilt, so the caller can redraw. */
    constructor(private canvas: HTMLCanvasElement, onRestored: () => void = () => {}) {
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
        // GPU resets, driver updates and sleep can drop the context; rebuild it
        // and re-upload the spectrum instead of leaving the plot blank.
        canvas.addEventListener('webglcontextlost', event => {
            event.preventDefault();
            this.initialized = false;
        });
        canvas.addEventListener('webglcontextrestored', () => {
            this.init();
            if (this.data)
                this.setData(this.data.frames, this.data.numFrames, this.data.bufferLength);
            onRestored();
        });
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
      uniform float uBins;
      uniform float uMaxFrequency;
      uniform float uTimeRatio;
      uniform float uDuration;
      uniform float uFrames;


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


      void main() {
        float y = mix(uView.z, uView.w, vTexCoord.y);
        float frequency = (1.0 - y) * uMaxFrequency;
        float time = mix(uView.x, uView.y, vTexCoord.x) * uTimeRatio;
        if(time > 1.0 || frequency > uSampleRate * 0.5){gl_FragColor=vec4(0.,0.,0.,1.);return;}
        float bin = min(uBins - 1.0, frequency / (uSampleRate * 0.5) * uBins);
        float windowSeconds = 2.0 * uBins / uSampleRate;
        float frameFraction = uDuration > windowSeconds ? clamp((time * uDuration - windowSeconds * 0.5) / (uDuration - windowSeconds), 0.0, 1.0) : 0.0;
        vec2 uv=vec2((frameFraction*(uFrames-1.0)+0.5)/uFrames,(uBins-bin-0.5)/uBins);
        vec4 texel=texture2D(uTexture,uv);
        float value=(texel.r*256.0+texel.a)/257.0;
        vec3 color;

        if (uColorScheme == 1) color = fireColor(value);
        else if (uColorScheme == 2) color = iceColor(value);
        else {
          if(value<0.55) color=mix(vec3(0.005,0.012,0.025),vec3(0.10,0.43,0.88),pow(value/0.55,1.8));
          else if(value<0.84) color=mix(vec3(0.10,0.43,0.88),vec3(1.0,0.56,0.07),smoothstep(0.55,0.84,value));
          else color=mix(vec3(1.0,0.56,0.07),vec3(1.0,0.97,0.90),smoothstep(0.84,1.0,value));
        }

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
        for (const name of UNIFORMS)
            this.uniforms[name] = gl.getUniformLocation(program, name);
        this.positionLocation = gl.getAttribLocation(program, 'aPosition');
        this.texCoordLocation = gl.getAttribLocation(program, 'aTexCoord');
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
        const pixelWidth = Math.max(1, Math.round(width * dpr)), pixelHeight = Math.max(1, Math.round(height * dpr));
        // Assigning a canvas size reallocates its drawing buffer even when unchanged.
        if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
            this.canvas.width = pixelWidth;
            this.canvas.height = pixelHeight;
        }
        this.gl.viewport(0, 0, pixelWidth, pixelHeight);
    }
    setData(frames: Float32Array[], numFrames: number, bufferLength: number): void {
        this.data = { frames, numFrames, bufferLength };
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
    render(colorScheme: number, sampleRate: number, view: SpectrumView, maxFrequency = sampleRate / 2, timeRatio = 1, duration = 1): void {
        if (!this.initialized || !this.program)
            return;
        const gl = this.gl;
        gl.clearColor(0.05, 0.05, 0.05, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        const u = this.uniforms;
        gl.uniform1i(u.uColorScheme, colorScheme);
        gl.uniform1f(u.uSampleRate, sampleRate);
        gl.uniform4f(u.uView, view.x0, view.x1, view.y0, view.y1);
        gl.uniform1f(u.uBins, this.bins);
        gl.uniform1f(u.uMaxFrequency, maxFrequency);
        gl.uniform1f(u.uTimeRatio, timeRatio);
        gl.uniform1f(u.uDuration, duration);
        gl.uniform1f(u.uFrames, this.frames);
        // Position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        // TexCoord attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        // Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(u.uTexture, 0);
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
