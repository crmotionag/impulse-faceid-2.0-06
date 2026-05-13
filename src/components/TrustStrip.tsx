export const TrustStrip = () => {
  const items = ["LGPD", "ANPD", "ISO 27001", "Dados locais", "Sem upload de vídeo"];
  return (
    <section className="border-y border-line bg-bg-2/60">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6 py-5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {items.map((item, i) => (
          <span key={item} className="flex items-center gap-3">
            {item}
            {i < items.length - 1 && <span className="text-muted-2">·</span>}
          </span>
        ))}
      </div>
    </section>
  );
};
