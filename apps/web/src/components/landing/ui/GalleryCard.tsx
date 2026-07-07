export function GalleryCard({ src, index }: { src: string; index: number }) {
  const crops = [
    "bottom-0 left-1/2 h-[637.258px] w-[360px] -translate-x-1/2 object-cover",
    "left-1/2 top-[-66px] h-[639px] w-[360px] -translate-x-1/2",
    "left-1/2 top-[-110px] h-[640px] w-[360px] -translate-x-1/2",
    "left-1/2 top-1/2 h-[540px] w-[360px] -translate-x-1/2 -translate-y-1/2 object-cover",
    "left-1/2 top-1/2 h-[642.353px] w-[360px] -translate-x-1/2 -translate-y-1/2 object-cover",
  ];

  return (
    <div className="relative h-[300px] w-[250px] shrink-0 overflow-hidden rounded-xl bg-white sm:h-[420px] sm:w-[360px]">
      <img src={src} alt={`VELORA project ${index + 1}`} className={`absolute max-w-none ${crops[index]}`} />
    </div>
  );
}
