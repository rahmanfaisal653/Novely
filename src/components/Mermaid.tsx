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
        // Auto-sanitize: fix common Mermaid label issues before render.
        // Mermaid chokes on spaces/special chars inside ["..."] labels
        // (e.g. A["Kinerja Karyawan di UMKM"]), leading 'o'/'x' node ids
        // (circle/cross edges), and lowercase 'end' (breaks flowchart).
        let safeChart = chart;
        try {
          safeChart = chart
            // 1. Clean ["..."] labels: strip spaces & non-alphanumeric (keep underscores)
            .replace(/\["([^"\]]*)"\]/g, (m, inner) => {
              const cleaned = (inner || '')
                .replace(/\s+/g, '')
                .replace(/[^A-Za-z0-9_]/g, '');
              return cleaned ? `["${cleaned}"]` : '[?]';
            })
            // 2. Clean bare [label] (no quotes): same treatment
            .replace(/\[([^"\]\[]+)\]/g, (m, inner) => {
              const cleaned = (inner || '').replace(/\s+/g, '').replace(/[^A-Za-z0-9_]/g, '');
              return cleaned ? `[${cleaned}]` : '[?]';
            })
            // 3. Prefix node ids that start with 'o'/'x' (avoid circle/cross edge)
            .replace(/^\s*([ox])([A-Za-z0-9_]+)\s*(\[|-->|-\.->)/gm, 'N$1$2$3')
            // 4. Lowercase standalone 'end' node → 'End' (lowercase 'end' breaks flowchart)
            .replace(/\["end"\]|\[end\]/g, '[End]')
            .replace(/\bend\b/g, 'End');
        } catch {
          safeChart = chart;
        }
        try {
          const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, safeChart);
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
