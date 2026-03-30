"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface ExportReportProps {
  targetRef: React.RefObject<HTMLElement | null>;
}

export function ExportReport({ targetRef }: ExportReportProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!targetRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background").includes("0.145")
          ? "#1a1a1a"
          : "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `swing-tracker-report-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [targetRef]);

  return (
    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport} disabled={exporting}>
      {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
      {exporting ? "Exporting…" : "Export PNG"}
    </Button>
  );
}
