// Read-only renderers for the newer proposal block types, shared by the public
// link, preview, and PDF pages.

export function DividerBlock() {
  return <div className="px-10 py-6"><hr className="border-t border-gray-200" /></div>;
}

export function SpacerBlock({ section }: { section: any }) {
  return <div style={{ height: section.height || 32 }} />;
}

export function StatisticsBlock({ section }: { section: any }) {
  const items: any[] = section.items || [];
  return (
    <div className="px-10 py-10 border-b border-gray-100">
      {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{section.heading}</h2>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.id} className="text-center">
            <p className="text-3xl font-bold text-blue-600">{it.value}</p>
            <p className="text-sm text-gray-500 mt-1">{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamBlock({ section }: { section: any }) {
  const members: any[] = section.members || [];
  return (
    <div className="px-10 py-10 border-b border-gray-100">
      {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{section.heading}</h2>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {members.map((m) => (
          <div key={m.id} className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {m.photo ? <img src={m.photo} alt={m.name} className="h-20 w-20 rounded-full object-cover mx-auto mb-2" /> : <div className="h-20 w-20 rounded-full bg-gray-100 mx-auto mb-2" />}
            <p className="font-semibold text-gray-900">{m.name}</p>
            <p className="text-sm text-gray-500">{m.role}</p>
            {m.bio && <p className="text-xs text-gray-400 mt-1">{m.bio}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GalleryBlock({ section }: { section: any }) {
  const images: any[] = section.images || [];
  if (images.length === 0) return null;
  return (
    <div className="px-10 py-10 border-b border-gray-100">
      {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.heading}</h2>}
      <div className="grid grid-cols-3 gap-2">
        {images.map((im) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={im.id} src={im.url} alt={im.caption || ""} className="w-full h-40 object-cover rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// One switch helper that returns the right block for these types (or null).
export function renderExtraBlock(section: any) {
  switch (section.type) {
    case "divider": return <DividerBlock />;
    case "spacer": return <SpacerBlock section={section} />;
    case "statistics": return <StatisticsBlock section={section} />;
    case "team": return <TeamBlock section={section} />;
    case "gallery": return <GalleryBlock section={section} />;
    default: return null;
  }
}
