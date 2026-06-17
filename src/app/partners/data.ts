import {
  CsmPartnerStatus,
  HmlValue,
  PermissionState,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const PARTNER_LIMIT = 30;
const PEO_OPTION_LIMIT = 75;
const csmStatusValues = new Set(Object.values(CsmPartnerStatus));
const hmlValues = new Set(Object.values(HmlValue));
const permissionValues = new Set(Object.values(PermissionState));
const confidenceValues = new Set(Object.values(SourceConfidence));

export type PartnerRoomsSearchParams = {
  confidence?: string;
  heat?: string;
  partnerId?: string;
  permission?: string;
  q?: string;
  status?: string;
};

export type PartnerRoomsFilters = {
  confidence?: SourceConfidence;
  heat?: HmlValue;
  partnerId?: string;
  permission?: PermissionState;
  q?: string;
  status?: CsmPartnerStatus;
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parsePartnerRoomsFilters(
  searchParams: PartnerRoomsSearchParams,
): PartnerRoomsFilters {
  return {
    confidence: parseEnum(searchParams.confidence, confidenceValues),
    heat: parseEnum(searchParams.heat, hmlValues),
    partnerId: searchParams.partnerId,
    permission: parseEnum(searchParams.permission, permissionValues),
    q: searchParams.q?.trim() || undefined,
    status: parseEnum(searchParams.status, csmStatusValues),
  };
}

export function buildPartnerRoomsPath(
  filters: PartnerRoomsFilters,
  overrides: Partial<PartnerRoomsFilters> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.confidence) params.set("confidence", next.confidence);
  if (next.heat) params.set("heat", next.heat);
  if (next.partnerId) params.set("partnerId", next.partnerId);
  if (next.permission) params.set("permission", next.permission);
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);

  const query = params.toString();
  return query ? `/partners?${query}` : "/partners";
}

function partnerWhere(filters: PartnerRoomsFilters) {
  const clauses: object[] = [];

  if (filters.q) {
    clauses.push({
      OR: [
        {
          name: {
            contains: filters.q,
          },
        },
        {
          email: {
            contains: filters.q,
          },
        },
        {
          trustSurfaceNotes: {
            contains: filters.q,
          },
        },
        {
          dosAndDonts: {
            contains: filters.q,
          },
        },
        {
          peos: {
            some: {
              name: {
                contains: filters.q,
              },
            },
          },
        },
      ],
    });
  }

  if (filters.confidence) {
    clauses.push({
      sourceConfidence: filters.confidence,
    });
  }

  if (filters.heat) {
    clauses.push({
      relationshipHeat: filters.heat,
    });
  }

  if (filters.permission) {
    clauses.push({
      permissionState: filters.permission,
    });
  }

  if (filters.status) {
    clauses.push({
      status: filters.status,
    });
  }

  return clauses.length > 0
    ? {
        AND: clauses,
      }
    : {};
}

async function findSelectedPartner(
  prisma: ReturnType<typeof getPrisma>,
  partnerId: string,
) {
  return prisma.cSMPartner.findUnique({
    include: {
      followUpPromises: {
        orderBy: {
          dueAt: "asc",
        },
        take: 8,
        where: {
          status: "OPEN",
        },
      },
      hmlClassifications: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
      notes: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      },
      peos: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 10,
      },
    },
    where: {
      id: partnerId,
    },
  });
}

export async function getPartnerRoomsData(filters: PartnerRoomsFilters) {
  if (!hasDatabaseEnv()) {
    return {
      counts: {
        highHeat: 0,
        openPromises: 0,
        partners: 0,
        peos: 0,
      },
      databaseReady: false,
      error: "Partner records cannot be loaded right now.",
      filters,
      limit: PARTNER_LIMIT,
      peoOptions: [],
      partners: [],
      selectedPartner: null,
    };
  }

  try {
    const prisma = getPrisma();
    const where = partnerWhere(filters);
    const [partners, partnersCount, peosCount, openPromises, highHeat, peoOptions] =
      await Promise.all([
        prisma.cSMPartner.findMany({
          include: {
            _count: {
              select: {
                followUpPromises: true,
                peos: true,
              },
            },
            peos: {
              orderBy: {
                updatedAt: "desc",
              },
              take: 3,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: PARTNER_LIMIT,
          where,
        }),
        prisma.cSMPartner.count({
          where,
        }),
        prisma.pEO.count(),
        prisma.followUpPromise.count({
          where: {
            status: "OPEN",
          },
        }),
        prisma.cSMPartner.count({
          where: {
            relationshipHeat: HmlValue.HIGH,
          },
        }),
        prisma.pEO.findMany({
          orderBy: {
            name: "asc",
          },
          select: {
            csmPartnerId: true,
            id: true,
            name: true,
          },
          take: PEO_OPTION_LIMIT,
        }),
      ]);
    const selectedPartnerId = filters.partnerId ?? partners[0]?.id;
    const selectedPartner =
      (selectedPartnerId ? await findSelectedPartner(prisma, selectedPartnerId) : null) ??
      (partners[0] ? await findSelectedPartner(prisma, partners[0].id) : null);

    return {
      counts: {
        highHeat,
        openPromises,
        partners: partnersCount,
        peos: peosCount,
      },
      databaseReady: true,
      error: null,
      filters,
      limit: PARTNER_LIMIT,
      peoOptions,
      partners,
      selectedPartner,
    };
  } catch (error) {
    console.error("CSM Partner Rooms load failed", error);

    return {
      counts: {
        highHeat: 0,
        openPromises: 0,
        partners: 0,
        peos: 0,
      },
      databaseReady: false,
      error: "Partner records cannot be loaded right now.",
      filters,
      limit: PARTNER_LIMIT,
      peoOptions: [],
      partners: [],
      selectedPartner: null,
    };
  }
}
