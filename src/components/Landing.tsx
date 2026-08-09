import Image from "next/image";

import { AuthForm } from "@/components/AuthForm";
import { signIn, signUp } from "@/app/auth/actions";

/**
 * Signed-out landing page.
 *
 * The catalogue is not shown here -- covers appear only as a background
 * collage, pushed back behind a vignette. You have to sign in to browse.
 */
export function Landing({
  mode,
  covers,
  next,
}: {
  mode: "login" | "signup";
  covers: string[];
  next?: string;
}) {
  // Repeat the covers so the collage fills wide screens without gaps.
  const tiles = covers.length
    ? Array.from({ length: 40 }, (_, i) => covers[i % covers.length])
    : [];

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      {/* Collage */}
      <div className="vignette pointer-events-none absolute inset-0">
        <div className="grid h-full w-full grid-cols-4 gap-1 opacity-[0.28] sm:grid-cols-6 lg:grid-cols-8">
          {tiles.map((src, i) => (
            <div key={i} className="relative aspect-square">
              <Image
                src={src}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
                unoptimized
                priority={i < 8}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col gap-12 px-6 py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-20">
        {/* Wordmark */}
        <div className="max-w-lg">
          <Image
            src="/favicon.ico"
            alt=""
            width={44}
            height={44}
            /* brightness-0 flattens the mark to black, invert then makes it
               pure white -- works whatever colours the source file uses. */
            className="brightness-0 invert"
          />
          <h1 className="mt-6 text-6xl font-extralight tracking-tight text-ink sm:text-7xl lg:text-8xl">
            moodio
          </h1>
          <p className="mt-5 max-w-md text-lg font-light leading-relaxed text-ink-muted">
            Every mood has a soundtrack. Find yours, queue it up, and let it
            play.
          </p>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-sm shrink-0 rounded-3xl border border-border bg-surface/90 p-8 shadow-2xl backdrop-blur-md">
          <AuthForm
            mode={mode}
            action={mode === "signup" ? signUp : signIn}
            next={next}
          />
        </div>
      </div>
    </div>
  );
}
