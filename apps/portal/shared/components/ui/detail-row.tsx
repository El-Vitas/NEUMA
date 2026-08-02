interface IProps {
  readonly label: string;
  readonly value: React.ReactNode;
}

export const DetailRow = ({ label, value }: IProps) => (
  <div>
    <p className="mb-1 text-muted-foreground text-xs">{label}</p>
    <p className="text-foreground">{value}</p>
  </div>
);
