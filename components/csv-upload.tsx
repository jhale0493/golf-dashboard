"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { parseCsvText } from "@/lib/csv-parser";
import type { ShotData } from "@/lib/types";

interface CsvUploadProps {
  onDataLoaded: (shots: ShotData[], fileName: string, rawCsv?: string) => void;
}

export function CsvUpload({ onDataLoaded }: CsvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          const shots = parseCsvText(text);
          if (shots.length > 0) {
            onDataLoaded(shots, file.name, text);
            setSyncing(true);
            try {
              await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: file.name, csvContent: text }),
              });
            } catch {} finally {
              setSyncing(false);
            }
          }
        };
        reader.readAsText(file);
      });
    },
    [onDataLoaded]
  );

  return (
    <Card className="border-dashed border-2 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-700">
      <CardContent className="flex items-center justify-center gap-3 py-4">
        <Upload className="h-5 w-5 text-emerald-600" />
        <span className="text-sm text-muted-foreground">Upload new session CSV</span>
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-400 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900"
          onClick={() => inputRef.current?.click()}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Syncing…
            </>
          ) : (
            "Choose Files"
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </CardContent>
    </Card>
  );
}
