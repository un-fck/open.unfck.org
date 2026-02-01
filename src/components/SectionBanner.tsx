import Image from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface SectionBannerProps {
  imageSrc: string;
  title: string;
  description: string;
  id?: string;
}

export function SectionBanner({
  imageSrc,
  title,
  description,
  id,
}: SectionBannerProps) {
  return (
    <section id={id} className="relative w-full">
      {/* Mobile: Stacked layout */}
      <div className="md:hidden">
        {/* Image strip */}
        <div className="relative aspect-[3/1] w-full overflow-hidden bg-gray-100">
          <Image
            src={`${basePath}${imageSrc}`}
            alt=""
            fill
            className="object-cover object-right"
            priority
          />
        </div>
        {/* Text below image */}
        <div className="bg-gray-50 px-6 py-6">
          <h2 className="mb-2 text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm leading-relaxed text-gray-700">{description}</p>
        </div>
      </div>

      {/* Desktop: Overlay layout - width-constrained, centered, full aspect ratio */}
      <div className="hidden w-full md:block">
        <div className="mx-auto max-w-[1440px]">
          <div className="relative aspect-[18/5] w-full overflow-hidden bg-gray-100">
            <Image
              src={`${basePath}${imageSrc}`}
              alt=""
              fill
              className="object-cover"
              priority
            />
            {/* Text overlay - inner container matching content width */}
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto w-full max-w-6xl px-12 lg:px-16">
                <div className="max-w-md lg:max-w-lg">
                  <h2 className="mb-3 text-2xl font-bold text-gray-900 lg:text-3xl">
                    {title}
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-700 lg:text-base">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
