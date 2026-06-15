import { conservationLabels, statusLabels, type ConservationStatus, type ItemStatus } from "@/lib/constants";

type Props = {
  kind: "status" | "conservation" | "neutral";
  value: string | null | undefined;
};

export function Badge({ kind, value }: Props) {
  if (!value) return <span className="badge neutral">-</span>;
  const label =
    kind === "status"
      ? statusLabels[value as ItemStatus]
      : kind === "conservation"
        ? conservationLabels[value as ConservationStatus]
        : value;

  return <span className={`badge ${value}`}>{label ?? value}</span>;
}
