import { Link } from 'react-router-dom';
import { PlusIcon, ShieldCheckIcon, Zap, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "./badge";
import { Button } from "./button";
import { cn } from "../../lib/utils";

const freeFeatures = [
  "2 compiles every 15 days",
  "React & HTML output",
  "Syntax highlighted preview",
  "Copy generated code",
];

const proFeatures = [
  "Unlimited compiles",
  "React & HTML output",
  "Syntax highlighted preview",
  "Priority compile queue",
  "Figma token management",
  "Early access to new features",
];

export function Pricing() {
  return (
    <section className="relative min-h-screen overflow-hidden py-24">
      <div id="pricing" className="mx-auto w-full max-w-6xl space-y-5 px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="mx-auto max-w-xl space-y-5"
        >
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111] border border-[#222] text-[#888] text-[11px] font-medium uppercase mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Pricing
            </div>
          </div>
          <h2 className="mt-5 text-center text-2xl font-bold tracking-tighter text-white md:text-3xl lg:text-4xl">
            Start Free. Scale When Ready.
          </h2>
          <p className="text-[#888] mt-5 text-center text-sm md:text-base">
            Try ZENO at no cost — get 2 free compiles every 15 days.
            Upgrade anytime for unlimited access and priority processing.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="relative">
          {/* Grid background */}
          <div
            className={cn(
              "z-[-10] pointer-events-none absolute inset-0 size-full",
              "[mask-image:radial-gradient(ellipse_at_center,transparent_10%,black)]"
            )}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-4xl space-y-2"
          >
            <div className="grid md:grid-cols-2 bg-[#050505] relative border border-[#222] p-4">
              {/* Corner plus icons */}
              <PlusIcon className="absolute -top-3 -left-3 size-5 text-[#444]" />
              <PlusIcon className="absolute -top-3 -right-3 size-5 text-[#444]" />
              <PlusIcon className="absolute -bottom-3 -left-3 size-5 text-[#444]" />
              <PlusIcon className="absolute -right-3 -bottom-3 size-5 text-[#444]" />

              {/* FREE PLAN */}
              <div className="flex flex-col h-full w-full px-4 pt-5 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="size-4 text-[#888]" />
                      <h3 className="leading-none font-semibold text-white">
                        Free
                      </h3>
                    </div>
                    <Badge variant="secondary">No credit card</Badge>
                  </div>
                  <p className="text-[#666] text-sm pt-1">
                    Perfect for trying out ZENO.
                  </p>
                </div>

                <div className="flex flex-col flex-1 mt-8 space-y-4">
                  <div>
                    <div className="text-[#666] flex items-end gap-0.5 text-xl">
                      <span className="text-white -mb-0.5 text-4xl font-extrabold tracking-tighter md:text-5xl">
                        $0
                      </span>
                      <span className="ml-1">/forever</span>
                    </div>

                    <ul className="space-y-2 mt-2">
                      {freeFeatures.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-[#666]">
                          <span className="w-1 h-1 rounded-full bg-[#444] flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-4">
                    <Button className="w-full" variant="outline" asChild>
                      <Link to="/signup">Get Started Free</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* PRO PLAN */}
              <div className="relative w-full group p-[1px] rounded-lg overflow-hidden bg-[#222] transition-all duration-700">
                <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_60%,#444444_85%,#ffffff_100%)] opacity-40 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_60%,#444444_85%,#ffffff_100%)] blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-1000"></div>
                <div className="relative z-10 flex flex-col h-full w-full bg-[#080808] rounded-lg px-4 pt-5 pb-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-white" />
                      <h3 className="leading-none font-semibold text-white">
                        Pro
                      </h3>
                    </div>
                    <Badge variant="default">Most Popular</Badge>
                  </div>
                  <p className="text-[#666] text-sm pt-1">
                    Unlimited power for serious builders.
                  </p>
                </div>

                <div className="flex flex-col flex-1 mt-8 space-y-4">
                  <div>
                    <div className="text-[#666] flex items-end gap-0.5 text-xl">
                      <span>$</span>
                      <span className="text-white -mb-0.5 text-4xl font-extrabold tracking-tighter md:text-5xl">
                        14.99
                      </span>
                      <span>/month</span>
                    </div>

                    <ul className="space-y-2 mt-2">
                      {proFeatures.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-[#888]">
                          <span className="w-1 h-1 rounded-full bg-white flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-4">
                    <Button className="w-full" asChild>
                      <Link to="/checkout">Upgrade to Pro</Link>
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Trust line */}
            <div className="text-[#555] flex items-center justify-center gap-x-2 text-sm pt-1">
              <ShieldCheckIcon className="size-4" />
              <span>Cancel anytime · No hidden fees · Billed monthly</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
