
import React, { useRef, useEffect, useState } from 'react';
import { Icons } from './Icons';

interface SimulationRunnerProps {
    code: string | null;
    images?: string[]; 
}

export const SimulationRunner: React.FC<SimulationRunnerProps> = ({ code, images = [] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const [renderKey, setRenderKey] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [parameter, setParameter] = useState(0.5); 
    const [isLoading, setIsLoading] = useState(false);

    const inputsRef = useRef({ 
        rotateX: 0, 
        rotateY: 0, 
        zoom: 1, 
        mouseX: 0, 
        mouseY: 0, 
        parameter: 0.5,
        images: [] as string[]
    });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (code) {
            setRenderKey(k => k + 1);
            setIsLoading(true);
        }
    }, [code, images]);

    useEffect(() => {
        inputsRef.current.parameter = parameter;
        inputsRef.current.images = images;
    }, [parameter, images]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const width = isFullScreen ? window.innerWidth : containerRef.current?.offsetWidth || 300;
                const height = isFullScreen ? window.innerHeight : containerRef.current?.offsetHeight || 300;
                
                canvasRef.current.width = width;
                canvasRef.current.height = height;
            }
        };
        
        setTimeout(handleResize, 50);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [renderKey, isFullScreen]);

    const runSimulation = () => {
        if (!canvasRef.current || !code) {
            setIsLoading(false);
            return;
        }
        
        setError(null);
        const canvas = canvasRef.current;
        
        inputsRef.current = { 
            ...inputsRef.current,
            rotateX: 0, 
            rotateY: 0, 
            zoom: 1, 
            mouseX: 0, 
            mouseY: 0, 
            parameter: parameter,
            images: images
        };

        if (cleanupRef.current) {
            try { cleanupRef.current(); } catch (e) { console.error("Cleanup error:", e); }
            cleanupRef.current = null;
        }

        try {
            // FIX: Robustly extract only the JavaScript code from the AI's response
            const extractCode = (raw: string) => {
                const startTag = "/// SIMULATION_START";
                const endTag = "/// SIMULATION_END";
                const startIdx = raw.indexOf(startTag);
                const endIdx = raw.indexOf(endTag);
                
                let extracted = "";
                if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                    extracted = raw.substring(startIdx + startTag.length, endIdx).trim();
                } else {
                    // Fallback to standard markdown blocks if markers are missing
                    const jsBlock = raw.match(/```(?:javascript|js)?([\s\S]*?)```/i);
                    extracted = jsBlock ? jsBlock[1].trim() : raw.trim();
                }
                
                // Final sanitize to remove any stray HTML that might be causing '<' errors
                return extracted.replace(/<[^>]*>?/gm, '');
            };

            const cleanCode = extractCode(code);

            // Dynamic execution: function(canvas, inputs)
            const simulationFunction = new Function('canvas', 'inputs', cleanCode);
            const cleanup = simulationFunction(canvas, inputsRef.current);
            
            if (typeof cleanup === 'function') {
                cleanupRef.current = cleanup;
            }
            setIsLoading(false);
        } catch (err) {
            console.error("Simulation execution error:", err);
            setError(`${err instanceof Error ? err.message : String(err)}`);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(runSimulation, 100);
        return () => {
            clearTimeout(timer);
            if (cleanupRef.current) cleanupRef.current();
        };
    }, [renderKey]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            inputsRef.current.mouseX = (e.clientX - rect.left) / rect.width * 2 - 1;
            inputsRef.current.mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        }

        if (!isDragging.current) return;
        const deltaX = e.clientX - lastMouse.current.x;
        const deltaY = e.clientY - lastMouse.current.y;
        
        inputsRef.current.rotateX += deltaX * 0.01;
        inputsRef.current.rotateY += deltaY * 0.01;
        
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleWheel = (e: React.WheelEvent) => {
        inputsRef.current.zoom += e.deltaY * 0.001;
        inputsRef.current.zoom = Math.min(Math.max(0.1, inputsRef.current.zoom), 5);
    };

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
        setTimeout(() => setRenderKey(k => k + 1), 100);
    };

    if (!code) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-900 rounded-xl border border-slate-700 font-commander">
                <Icons.PlayCircle className="h-16 w-16 mb-4 opacity-50 text-cyan-600" />
                <p className="text-lg text-cyan-400 tracking-widest">LAB ENVIRONMENT READY</p>
                <p className="text-xs opacity-70">Inject data to begin Nano Banana Visualization</p>
            </div>
        );
    }

    const containerClasses = isFullScreen 
        ? "fixed inset-0 z-50 bg-slate-900" 
        : "relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner";

    return (
        <div ref={containerRef} className={containerClasses}>
            <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start z-10 pointer-events-none">
                <div className="pointer-events-auto bg-slate-800/80 backdrop-blur-md p-2 rounded-lg border border-slate-600 flex flex-col gap-1 w-64 shadow-xl">
                    <label className="text-xs text-cyan-400 font-bold uppercase tracking-wider flex justify-between">
                        <span>Lab Variable</span>
                        <span>{Math.round(parameter * 100)}%</span>
                    </label>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={parameter}
                        onChange={(e) => setParameter(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <button 
                        onClick={() => setRenderKey(k => k + 1)} 
                        className="p-2 bg-slate-800/80 hover:bg-cyan-600/80 text-white rounded-full backdrop-blur-sm transition-colors border border-slate-600"
                        title="Re-Initialize Lab"
                    >
                        <Icons.RefreshCw className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={toggleFullScreen}
                        className="p-2 bg-slate-800/80 hover:bg-cyan-600/80 text-white rounded-full backdrop-blur-sm transition-colors border border-slate-600"
                        title={isFullScreen ? "Exit Lab" : "Expand Lab"}
                    >
                        {isFullScreen ? <Icons.Minimize className="h-5 w-5" /> : <Icons.Maximize className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-20 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <Icons.Cpu className="h-10 w-10 text-cyan-400 animate-pulse mb-2" />
                        <span className="text-cyan-400 font-commander text-sm tracking-widest uppercase">Initializing Canvas...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-20 backdrop-blur-sm p-8">
                    <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg max-w-lg text-center font-commander">
                        <Icons.AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                        <h3 className="text-red-400 font-black uppercase text-sm tracking-widest mb-2">Execution Error</h3>
                        <p className="text-red-200 text-xs font-mono text-left bg-black/30 p-2 rounded max-h-40 overflow-y-auto mb-4">{error}</p>
                        <button onClick={() => setRenderKey(k => k + 1)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] tracking-[0.2em] transition-colors">RETRY HANDSHAKE</button>
                    </div>
                </div>
            )}

            <canvas 
                ref={canvasRef} 
                key={renderKey}
                className="block w-full h-full cursor-move touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            />
            
            <div className="absolute bottom-4 left-4 pointer-events-none text-[9px] font-black uppercase tracking-widest text-slate-500 bg-black/40 p-2 rounded-lg backdrop-blur-sm border border-slate-700/50">
                LMB: Rotate • Wheel: Zoom • Slider: Adjust
            </div>
        </div>
    );
};
