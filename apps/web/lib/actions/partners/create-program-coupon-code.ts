"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { stripeAppClient } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { Coupon } from "@dub/prisma/client";
import Stripe from "stripe";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const createCouponCodeSchema = z.object({
  partnerId: z.string(),
  linkId: z.string(),
  couponId: z.string(),
});

export const createProgramCouponCodeAction = authActionClient
  .schema(createCouponCodeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;

    if (!workspace.stripeConnectId) {
      throw new Error(
        "Could not found the Stripe account ID for this workspace.",
      );
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { links } = await getProgramEnrollmentOrThrow({
      programId,
      partnerId: parsedInput.partnerId,
    });

    const partnerLink = links.find((link) => link.id === parsedInput.linkId);

    if (!partnerLink) {
      throw new Error("Partner link not found.");
    }

    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: {
        id: parsedInput.couponId,
      },
    });

    if (coupon.programId !== programId) {
      throw new Error("Coupon is not associated with this program.");
    }

    const stripeApp = stripeAppClient({
      livemode: process.env.NODE_ENV === "production",
    });

    const stripeCoupon = await stripeApp.coupons.create(
      toStripeCouponInput(coupon),
      {
        stripeAccount: workspace.stripeConnectId,
      },
    );

    console.log(stripeCoupon);
  });

const toStripeCouponInput = (coupon: Coupon): Stripe.CouponCreateParams => {
  let duration: "forever" | "once" | "repeating" = "once";

  if (coupon.maxDuration === 0) {
    duration = "once";
  } else if (coupon.maxDuration === null) {
    duration = "forever";
  } else {
    duration = "repeating";
  }

  return {
    name: coupon.name,
    ...(coupon.type === "percentage" && {
      percent_off: coupon.amount,
    }),
    ...(coupon.type === "flat" && {
      amount_off: coupon.amount,
    }),
    duration,
    ...(duration === "repeating" && {
      duration_in_months: coupon.maxDuration ?? undefined,
    }),
  };
};
