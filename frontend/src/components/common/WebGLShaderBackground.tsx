import React, { useEffect, useRef, useState } from 'react';

interface WebGLShaderBackgroundProps {
  className?: string;
  opacity?: number;
}

const WebGLShaderBackground: React.FC<WebGLShaderBackgroundProps> = ({ 
  className = '', 
  opacity = 0.97 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported, falling back to CSS shader');
      setIsLoaded(true);
      return;
    }

    glRef.current = gl;

    // Vertex shader source
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_uv = a_position * 0.5 + 0.5;
      }
    `;

    // Fragment shader source - recreating the Swirl and ChromaFlow effects
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_opacity;
      
      varying vec2 v_uv;
      
      // Noise function
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      // Swirl effect
      vec3 swirl(vec2 uv, float time) {
        vec2 center = vec2(0.5, 0.5);
        vec2 offset = uv - center;
        float angle = length(offset) * 3.0 - time * 0.8;
        float swirlFactor = sin(angle) * 0.1 + cos(angle * 0.5) * 0.05;
        
        vec2 swirled = vec2(
          offset.x * cos(swirlFactor) - offset.y * sin(swirlFactor),
          offset.x * sin(swirlFactor) + offset.y * cos(swirlFactor)
        ) + center;
        
        // Color mixing based on swirl
        vec3 colorA = vec3(0.071, 0.463, 0.847); // #1275d8
        vec3 colorB = vec3(0.882, 0.569, 0.212); // #e19136
        
        float mixFactor = sin(length(swirled - center) * 4.0 + time * 0.8) * 0.5 + 0.5;
        return mix(colorA, colorB, mixFactor);
      }
      
      // ChromaFlow effect
      vec3 chromaFlow(vec2 uv, float time) {
        vec2 flow = vec2(
          sin(uv.x * 2.0 + time * 0.5) * 0.1,
          cos(uv.y * 2.0 + time * 0.3) * 0.1
        );
        
        vec2 flowUV = uv + flow;
        
        // Base colors
        vec3 baseColor = vec3(0.0, 0.4, 1.0); // #0066ff
        vec3 upColor = vec3(0.0, 0.4, 1.0); // #0066ff
        vec3 downColor = vec3(0.82, 0.82, 0.82); // #d1d1d1
        vec3 leftColor = vec3(0.882, 0.569, 0.212); // #e19136
        vec3 rightColor = vec3(0.882, 0.569, 0.212); // #e19136
        
        // Create flow pattern
        float flowPattern = sin(flowUV.x * 3.0) * cos(flowUV.y * 3.0);
        flowPattern = flowPattern * 0.5 + 0.5;
        
        // Mix colors based on position and flow
        vec3 color = mix(
          mix(upColor, downColor, flowUV.y),
          mix(leftColor, rightColor, flowUV.x),
          flowPattern * 0.3
        );
        
        return color;
      }
      
      void main() {
        vec2 uv = v_uv;
        float time = u_time;
        
        // Create the swirl effect
        vec3 swirlColor = swirl(uv, time);
        
        // Create the chroma flow effect
        vec3 flowColor = chromaFlow(uv, time);
        
        // Blend the effects
        vec3 finalColor = mix(swirlColor, flowColor, 0.6);
        
        // Add some noise for texture
        float noiseValue = noise(uv * 100.0 + time) * 0.1;
        finalColor += noiseValue;
        
        // Apply opacity
        gl_FragColor = vec4(finalColor, u_opacity);
      }
    `;

    // Create shader program
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) return;

    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
      return;
    }
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
      return;
    }

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;

    // Create quad vertices
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const animate = () => {
      if (!gl || !program) return;
      
      timeRef.current += 0.01;
      
      gl.useProgram(program);
      
      // Set uniforms
      const timeLocation = gl.getUniformLocation(program, 'u_time');
      const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
      const opacityLocation = gl.getUniformLocation(program, 'u_opacity');
      
      gl.uniform1f(timeLocation, timeRef.current);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(opacityLocation, opacity);
      
      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Start animation
    animate();
    setIsLoaded(true);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gl && program) {
        gl.deleteProgram(program);
      }
    };
  }, [opacity]);

  return (
    <div className={`fixed inset-0 z-0 ${className}`}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          background: 'transparent',
          mixBlendMode: 'multiply'
        }}
      />
      {/* Black overlay like in original */}
      <div 
        className="absolute inset-0 bg-black/20"
        style={{ mixBlendMode: 'multiply' }}
      />
    </div>
  );
};

export default WebGLShaderBackground;
