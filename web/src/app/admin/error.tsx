"use client";

import { ServidorDespertando } from "@/components/estado/ServidorDespertando";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
}) {
  return (
    <div className="py-8">
      <ServidorDespertando error={props.error} retry={props.retry} />
    </div>
  );
}
