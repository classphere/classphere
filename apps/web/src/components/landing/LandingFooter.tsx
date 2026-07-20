import Image from "next/image";

export function LandingFooter() {
  return (
    <footer className="bg-[#edecec] px-5 py-12 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div>
            <a href="#top" className="flex items-center gap-3 text-xl font-bold text-[#171717]">
              <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
              Classphere
            </a>
            <p className="mt-5 max-w-sm font-manrope text-[#6d6d6d]">
              A focused preparation platform for coaching institutes and ambitious students.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div>
              <h3 className="font-semibold text-[#202020]">Explore</h3>
              <div className="mt-4 grid gap-3 text-[#595959]">
                <a href="#modules">Platform</a>
                <a href="#workflow">How it works</a>
                <a href="#pricing">Pricing</a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-[#202020]">Get started</h3>
              <div className="mt-4 grid gap-3 text-[#595959]">
                <a href="#contact">Book a demo</a>
                <a href="#contact">Talk to the team</a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-dashed border-[#c0c0c0] pt-6 font-manrope text-sm font-semibold text-[#757575]">
          <span>© 2026 Classphere. Built for better preparation.</span>
          <span>Made for institutes and learners</span>
        </div>
      </div>
    </footer>
  );
}
