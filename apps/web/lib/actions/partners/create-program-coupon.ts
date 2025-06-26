"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { maxDurationSchema } from "@/lib/zod/schemas/misc";
import { prisma } from "@dub/prisma";
import { CouponStructure } from "@dub/prisma/client";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const createCouponSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  amount: z.number().min(1),
  type: z.nativeEnum(CouponStructure).default("flat"),
  maxDuration: maxDurationSchema,
});

export const createProgramCouponAction = authActionClient
  .schema(createCouponSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.coupon.create({
      data: {
        programId,
        name: parsedInput.name,
        amount: parsedInput.amount,
        type: parsedInput.type,
        maxDuration: parsedInput.maxDuration,
      },
    });
  });
