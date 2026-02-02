import Image from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function PageHeader() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      {/* Skip link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4 md:px-12 lg:px-16">
        <Image
          src={`${basePath}/images/UN_Logo_Stacked_Colour_English.svg`}
          alt="United Nations"
          width={60}
          height={60}
          className="h-12 w-auto select-none md:h-14"
          draggable={false}
        />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          Transparency Portal
        </h1>
      </div>
    </header>
  );
}
