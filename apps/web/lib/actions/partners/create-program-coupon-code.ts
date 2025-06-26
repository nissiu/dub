"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { stripeAppClient } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const createCouponCodeSchema = z.object({
  partnerId: z.string(),
  linkId: z.string(),
  couponId: z.string(),
  code: z.string().optional(),
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

    const stripeCoupon = await stripeApp.promotionCodes.create(
      {
        coupon: coupon.couponId,
        code: parsedInput.code,
      },
      {
        stripeAccount: workspace.stripeConnectId,
      },
    );

    console.log(stripeCoupon);
  });
