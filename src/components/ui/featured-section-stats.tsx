import {
    AreaChart,
    Area,
    ResponsiveContainer,
    Tooltip,
  } from "recharts";
  
  const avatars = [
    {
      src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
      alt: "Developer 01",
    },
    {
      src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
      alt: "Developer 02",
    },
    {
      src: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop&crop=face",
      alt: "Developer 03",
    },
    {
      src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face",
      alt: "Developer 04",
    },
  ];
  
  export default function FeaturedSectionStats() {
    const data = [
      { name: "Jan", value: 120 },
      { name: "Feb", value: 350 },
      { name: "Mar", value: 580 },
      { name: "Apr", value: 900 },
      { name: "May", value: 1140 },
      { name: "Jun", value: 1290 },
      { name: "Jul", value: 1460 },
    ];
  
    return (
      <section className="w-full max-w-6xl mx-auto text-left py-32">
        <div className="px-4">
  
          {/* Avatar social proof badge */}
          <div className="mb-8 inline-flex items-center rounded-full border border-[#222] bg-[#0a0a0a] p-1 shadow shadow-black/5">
            <div className="flex -space-x-1.5">
              {avatars.map((avatar) => (
                <img
                  key={avatar.alt}
                  className="rounded-full ring-1 ring-[#0a0a0a]"
                  src={avatar.src}
                  width={20}
                  height={20}
                  alt={avatar.alt}
                />
              ))}
            </div>
            <p className="px-2 text-xs text-[#888]">
              Trusted by{" "}
              <strong className="font-medium text-white">1K+</strong>{" "}
              developers.
            </p>
          </div>
  
          <h3 className="text-lg sm:text-xl lg:text-4xl font-medium text-white mb-16">
            Powering developers with instant design-to-code.{" "}
            <span className="text-[#555] text-sm sm:text-base lg:text-4xl">
              ZENO's deterministic compiler engine bridges the gap between Figma
              and production — no AI guesswork, no hallucinations, just exact UI
              replication in seconds.
            </span>
          </h3>
  
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8">
            <div>
              <p className="text-3xl font-medium text-white">10,000+</p>
              <p className="text-[#888] text-md">Figma Frames Compiled</p>
            </div>
            <div>
              <p className="text-3xl font-medium text-white">98.5%</p>
              <p className="text-[#888] text-md">Accurate Output</p>
            </div>
            <div>
              <p className="text-3xl font-medium text-white">1,400+</p>
              <p className="text-[#888] text-md">Developers Using Zeno</p>
            </div>
            <div>
              <p className="text-3xl font-medium text-white">&lt; 4s</p>
              <p className="text-[#888] text-md">Avg. Compile Time</p>
            </div>
          </div>
        </div>
  
        {/* Area Chart */}
        <div className="w-full h-48 mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorWhite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111",
                  border: "1px solid #222",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#888" }}
                cursor={{ stroke: "#333", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorWhite)"
                strokeOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    );
  }
