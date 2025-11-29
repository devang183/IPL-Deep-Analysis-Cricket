import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PresentationControls, Stage, Environment } from '@react-three/drei';
import { Loader2 } from 'lucide-react';

function Model({ url }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();

  // Optional: Add subtle rotation animation
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return <primitive ref={modelRef} object={scene} scale={1.5} />;
}

function Model3DViewer({ modelPath = '/models/Virat-Kohli.glb', showControls = true }) {
  return (
    <div className="w-full h-full min-h-[400px] relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Info overlay */}
      {showControls && (
        <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
          <p className="text-xs text-white/80 font-medium">
            🖱️ Drag to rotate • Scroll to zoom • Right-click to pan
          </p>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />

          {/* Environment for reflections */}
          <Environment preset="city" />

          {/* Model with presentation controls */}
          <PresentationControls
            speed={1.5}
            global
            zoom={0.8}
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
          >
            <Stage environment={null} intensity={0.5} contactShadow={false}>
              <Model url={modelPath} />
            </Stage>
          </PresentationControls>

          {/* Orbit controls for full manual control */}
          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.75}
            enableZoom={true}
            enablePan={true}
            zoomSpeed={0.5}
          />
        </Suspense>
      </Canvas>

      {/* Loading fallback overlay */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading 3D Model...</p>
          </div>
        </div>
      }>
        {/* This empty Suspense ensures loading state shows */}
      </Suspense>
    </div>
  );
}

export default Model3DViewer;
