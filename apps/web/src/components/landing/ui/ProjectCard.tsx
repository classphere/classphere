export function ProjectCard({ image, title, type }: { image: string; title: string; type: string }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-[#edecec]">
      <img src={image} alt="" className="h-72 w-full object-cover" />
      <div className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-[#7d7d7d]">{type}</p>
          <h3 className="mt-1 text-2xl font-semibold">{title}</h3>
        </div>
        <span className="text-2xl">↗</span>
      </div>
    </article>
  );
}
