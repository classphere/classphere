export function LandingFooter() {
  return (
    <footer className="bg-[#edecec] px-5 py-12 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div>
            <a href="#top" className="text-2xl font-bold text-black">CLASSPHERE</a>
            <p className="mt-5 max-w-sm font-manrope text-[#838383]">
              Classphere empowers institutes to teach better through data.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div>
              <h3 className="font-semibold text-black">Page</h3>
              <div className="mt-4 grid gap-3 text-[#4a4a4a]">
                <a href="#about">About us</a>
                <a href="#work">Works</a>
                <a href="#services">Services</a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-black">Contact us</h3>
              <div className="mt-4 grid gap-3 text-[#4a4a4a]">
                <a href="mailto:support@classphere.com">support@classphere.com</a>
                <a href="tel:+14636313620">+1 (463) 631 3620</a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-dashed border-[#c0c0c0] pt-6 font-manrope text-sm font-semibold text-[#838383]">
          <span>©2026 CLASSPHERE. DESIGNED BY HARSH</span>
          <span>BUILT IN NEXT.JS</span>
        </div>
      </div>
    </footer>
  );
}
