import { stripeAppClient } from "@/lib/stripe";
import "dotenv-flow/config";

async function main() {
  const stripeApp = stripeAppClient({
    livemode: process.env.NODE_ENV === "production",
  });

  const stripeCoupon = await stripeApp.coupons.create(
    {
      name: "Coupon 1",
      percent_off: 30,
      duration: "repeating",
      duration_in_months: 12,
    },
    {
      stripeAccount: "acct_1QjidyD0vI74xfCN",
    },
  );

  console.log(stripeCoupon);
}

main();
