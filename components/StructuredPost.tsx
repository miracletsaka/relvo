function StructuredPost({ item }: { item: any }) {

  const bullets: string[] = Array.isArray(item.bullets) ? item.bullets : [];

  return (
    <div className="space-y-3">
      {/* Hook */}
      {item.hook && (
        <h3 className="text-base text-neutral-900 uppercase md:text-lg font-semibold leading-snug">
          {item.hook}
        </h3>
      )}

      {/* Subheading */}
      {item.subheading && (
        <h4 className="text-sm md:text-base text-neutral-700">
          {item.subheading}
        </h4>
      )}

      {/* Bullets */}
      {bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 md:text-base text-neutral-600">
          {bullets.map((b, i) => (
            <li className="text-xs" key={i}>{b}</li>
          ))}
        </ul>
      )}

      {/* Proof */}
      {item.proof && (
        <div className="text-xs md:text-sm text-neutral-900 border border-white/10 rounded-lg p-3">
          <span className="font-semibold">Proof:</span> {item.proof}
        </div>
      )}

      {/* CTA */}
      {item.cta && (
        <div className="text-sm md:text-base font-bold text-ggray-600 bg-white/5 border border-white/10 rounded-lg p-3">
          {item.cta}
        </div>
      )}

      {/* Hashtags */}
      {item.hashtags && (
        <p className="text-xs md:text-sm line-clamp-2 text-neutral-400">
          {item.hashtags}
        </p>
      )}
    </div>
  );
}
export default StructuredPost;