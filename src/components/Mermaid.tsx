import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  flowchart: { htmlLabels: false },
});

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
      
      // We need to render explicitly because contentLoaded might not catch dynamic updates well
      const renderChart = async () => {
        try {
          const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid render error:', error);
          if (ref.current) {
            ref.current.innerHTML = '<p class="text-red-500 text-sm">Gagal merender diagram. Pastikan sintaks Mermaid benar.</p>';
          }
        }
      };
      
      renderChart();
    }
  }, [chart]);

  return <div key={chart} ref={ref} className="mermaid-container flex justify-center my-8 overflow-x-auto p-4 bg-white rounded-xl border border-slate-200 shadow-sm" />;
};

export default Mermaid;
