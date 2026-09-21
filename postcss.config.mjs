// @csstools/postcss-cascade-layers flattens Tailwind v4's @layer blocks into
// plain rules with equivalent specificity. Safari 15.3 and older (macOS Big
// Sur and earlier, iOS 15.3 and older) ignore @layer entirely, which dropped
// ~77% of the site's CSS and left pages unstyled. Must run after Tailwind.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
