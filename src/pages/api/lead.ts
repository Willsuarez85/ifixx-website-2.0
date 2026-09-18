import type { APIRoute } from 'astro';

export const prerender = false;

// Ifixx 2026 pipeline (renamed from "iFIXX Outdoor Leads"; same ID, so this keeps
// working). Every website lead is now routed here to the New Lead stage; GHL then
// handles team notification + AI intake off "opportunity created in Ifixx 2026".
const OUTDOOR_PIPELINE_ID = 'QlQ4FGiqHYUgMAUwxjb1';
const OUTDOOR_NEW_LEAD_STAGE_ID = '2f5e3e61-cbe2-4350-8010-dd8c3335d419';
const HANDYMAN_PIPELINE_ID = 'ohDTFoWOfNfAYQ89MWEo';

// campaignTest value that every South Charlotte service-test landing form posts
// (see LandingEstimateForm.astro). It is what earns the 'south-charlotte-test' tag.
const SOUTH_CHARLOTTE_TEST = 'ifixx_south_charlotte_service_test_2026_07';

// Tag mapping by service type - GHL workflows will use these to route leads
// Pipeline routing: handyman (includes urgent) OR remodeling
const SERVICE_TAGS: Record<string, string[]> = {
    // Handyman Services → Pipeline: Handyman
    // No 'plumbing' / 'electrical' / 'fixtures' keys: those trades are retired, no form
    // posts them, and keeping them would let a stray payload tag a lead into work iFIXX
    // cannot take. 'fixtures' left on 2026-09-17 with the "Fixtures & Lighting" option
    // on /contact and the faucet, outlet and ceiling-fan options on the landing form.
    'handyman': ['service-general-repairs', 'handyman'],
    'carpentry': ['service-carpentry', 'handyman'],
    'painting': ['service-painting', 'handyman'],
    'doors-windows': ['service-doors-windows', 'handyman'],
    'general-repairs': ['service-general-repairs', 'handyman'],
    'tv-mounting': ['service-tv-mounting', 'handyman'],

    // Decks, porches and fences.
    // Pipeline routing (handled by GHL workflows on these tags):
    //   drywall + interior painting  → 'handyman'     → Handyman pipeline
    //   deck repair / rebuild / build → 'deck-outdoor' → Deck & Outdoor Living pipeline
    // Deck leads carry 'deck-outdoor' as the single, unambiguous routing tag. They keep
    // 'handyman' too for backwards-compat notifications; the Handyman routing workflow
    // must exclude contacts tagged 'deck-outdoor' so they don't double-route.
    //
    // 'south-charlotte-test' used to be baked into these six keys, which meant the
    // site-wide forms could not reuse them without polluting the test. It now comes from
    // the campaignTest field, which every South Charlotte landing form already sends, so
    // the tags those landings produce are unchanged.
    'drywall-repair': ['service-drywall-repair', 'service-painting', 'handyman'],
    'interior-painting': ['service-painting', 'service-drywall-repair', 'handyman'],
    'deck-repair': ['service-deck-repair', 'service-carpentry', 'deck-outdoor', 'handyman'],
    // New deck construction — higher-ticket, longer sales cycle. 'project-deck-build'
    // flags it for a heavier follow-up within the Deck & Outdoor Living pipeline.
    'deck-build': ['service-deck-build', 'project-deck-build', 'service-carpentry', 'deck-outdoor', 'handyman'],
    'screened-porch': ['service-screened-porch', 'project-deck-build', 'service-carpentry', 'deck-outdoor', 'handyman'],
    // Fence line (new 2026-07). Routing tag 'fence-outdoor' for the Fence and Outdoor
    // pipeline (create in GHL). Same double-route caveat as deck: the Handyman routing
    // workflow must exclude contacts tagged 'fence-outdoor'. 'project-fence-install'
    // flags the higher-ticket installs for a heavier follow-up vs. repairs.
    'fence-install': ['service-fence-install', 'project-fence-install', 'fence-outdoor', 'handyman'],
    'fence-repair': ['service-fence-repair', 'fence-outdoor', 'handyman'],

    // Emergency/Urgent Services → Pipeline: Handyman (with urgent flag)
    // 'emergency-plumbing' and 'emergency-electrical' removed: no form posts them
    // (verified against the build) and they tagged leads into retired trades.
    // 'emergency' (/contact) and 'emergency-repair' (landing forms) are the same intent
    // under two names the forms already use; both are urgent handyman work.
    'emergency': ['service-emergency', 'handyman', 'urgent'],
    'emergency-repair': ['service-emergency', 'handyman', 'urgent'],
    // Water damage means the repair after the water stops: drywall, ceilings, trim,
    // finishes. iFIXX does not do the plumbing that caused it.
    'water-damage': ['service-water-damage', 'service-drywall', 'handyman', 'urgent'],
    'roof-leak': ['emergency-roof-leak', 'handyman', 'urgent'],

    // Remodeling Services → Pipeline: Remodeling
    'kitchen-remodel': ['project-kitchen', 'remodeling'],
    'bathroom-remodel': ['project-bathroom', 'remodeling'],
    'flooring': ['service-flooring', 'remodeling'],

    // Legacy generic fence/deck values. No form offers them since 2026-09-17 (the
    // site-wide form now posts fence-repair, deck-repair, deck-build or screened-porch),
    // but a cached page can still submit them, so they stay mapped.
    'fence': ['service-fence', 'fence-outdoor', 'handyman'],
    'deck': ['service-deck', 'deck-outdoor', 'handyman'],

    // Specialty Services → Pipeline: Handyman
    'pressure-washing': ['service-pressure-washing', 'handyman'],
    'drywall': ['service-drywall', 'handyman'],
    'quick-fix': ['service-quick-fix', 'handyman'],

    // Default → Pipeline: Handyman
    'other': ['general-inquiry', 'handyman']
};

// Which landing converts? The contact's `source` names the form's page in words, and
// these tags make the same thing filterable/segmentable inside GHL.
function slugify(value: string, maxLength = 40): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLength)
        .replace(/-+$/g, '');
}

function pathSlug(path?: string): string {
    if (!path) return '';
    const clean = String(path).split('?')[0].split('#')[0];
    if (!clean || clean === '/') return 'home';
    return slugify(clean);
}

// page_path / landing_page come from the browser: accept a single-slash relative path
// only, so nothing can be talked into building an off-site URL.
function safePath(path?: string): string {
    if (typeof path !== 'string') return '';
    const clean = path.split('?')[0].split('#')[0].trim();
    if (!/^\/[^/\\]/.test(clean) && clean !== '/') return '';
    return clean.slice(0, 200);
}

function buildLeadMessage(data: {
    message?: string;
    issueType?: string;
    safetyConcern?: string;
    landingPage?: string;
    campaignTest?: string;
    photoUploadStatus?: string;
    photoCount?: number | string;
}) {
    const {
        message,
        issueType,
        safetyConcern,
        landingPage,
        campaignTest,
        photoUploadStatus,
        photoCount
    } = data;

    const hasLandingContext = issueType || safetyConcern || landingPage || campaignTest || photoUploadStatus || photoCount !== undefined;

    if (!hasLandingContext || message?.includes('Issue type:')) {
        return message || '';
    }

    return [
        `Issue type: ${issueType || 'Not provided'}`,
        `Safety concern: ${safetyConcern || 'Not provided'}`,
        `Landing page: ${landingPage || 'Not provided'}`,
        `Campaign test: ${campaignTest || 'Not provided'}`,
        `Photo status: ${photoUploadStatus || 'Not provided'} (${photoCount ?? 0} selected)`,
        photoUploadStatus === 'photos-selected-browser-only'
            ? 'Customer selected photos in the browser, but files are not uploaded to GHL by this v1 form. Ask customer to text photos to (980) 391-6833 if they did not come through.'
            : 'No photos selected in the browser. Ask customer to text photos to (980) 391-6833 if photos would help review the repair.',
        '',
        'Customer description:',
        message || 'Not provided'
    ].join('\n');
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRecentOpportunity(opp: any, startedAt: Date) {
    const createdAt = opp.createdAt || opp.dateAdded || opp.created_at;

    if (!createdAt) {
        return true;
    }

    const createdTime = new Date(createdAt).getTime();
    return Number.isFinite(createdTime) && createdTime >= startedAt.getTime() - 30000;
}

async function ghlRequest(
    path: string,
    apiKey: string,
    init: RequestInit = {}
) {
    return fetch(`https://services.leadconnectorhq.com${path}`, {
        ...init,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
            ...(init.headers || {})
        }
    });
}

async function upsertContact(apiKey: string, body: Record<string, any>) {
    return fetch('https://services.leadconnectorhq.com/contacts/upsert', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
        },
        body: JSON.stringify(body)
    });
}

async function searchContactOpportunities(apiKey: string, locationId: string, contactId: string) {
    const params = new URLSearchParams({
        location_id: locationId,
        contact_id: contactId,
        limit: '20'
    });

    const response = await ghlRequest(`/opportunities/search?${params.toString()}`, apiKey, {
        method: 'GET'
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to search GHL opportunities: ${err}`);
    }

    const result = await response.json();
    return Array.isArray(result.opportunities) ? result.opportunities : [];
}

async function deleteOpportunity(apiKey: string, opportunityId: string) {
    const response = await ghlRequest(`/opportunities/${opportunityId}`, apiKey, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to delete duplicate Handyman opportunity: ${err}`);
    }
}

async function cleanupRecentHandymanDuplicates(options: {
    apiKey: string;
    locationId: string;
    contactId: string;
    startedAt: Date;
}) {
    const { apiKey, locationId, contactId, startedAt } = options;
    const opportunities = await searchContactOpportunities(apiKey, locationId, contactId);
    const hasOutdoor = opportunities.some((opp: any) =>
        opp.pipelineId === OUTDOOR_PIPELINE_ID && opp.status !== 'lost' && opp.status !== 'abandoned'
    );

    if (!hasOutdoor) {
        return [];
    }

    const duplicates = opportunities.filter((opp: any) =>
        opp.pipelineId === HANDYMAN_PIPELINE_ID &&
        opp.status !== 'lost' &&
        opp.status !== 'abandoned' &&
        isRecentOpportunity(opp, startedAt)
    );

    for (const duplicate of duplicates) {
        await deleteOpportunity(apiKey, duplicate.id);
    }

    return duplicates.map((opp: any) => opp.id);
}

async function routeWebsiteOpportunity(options: {
    apiKey: string;
    locationId: string;
    contactId: string;
    firstName: string;
    lastName?: string;
    service?: string;
    source?: string;
    startedAt: Date;
}) {
    const { apiKey, locationId, contactId, firstName, lastName, service, source, startedAt } = options;
    const contactName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Website Lead';
    const opportunityName = `${contactName} - Website Lead`;

    for (let attempt = 0; attempt < 8; attempt++) {
        if (attempt > 0) {
            await wait(800);
        }

        const opportunities = await searchContactOpportunities(apiKey, locationId, contactId);
        const openOutdoor = opportunities.find((opp: any) =>
            opp.pipelineId === OUTDOOR_PIPELINE_ID && opp.status !== 'lost' && opp.status !== 'abandoned'
        );

        if (openOutdoor) {
            const deletedHandymanDuplicates = await cleanupRecentHandymanDuplicates({
                apiKey,
                locationId,
                contactId,
                startedAt
            });

            return { action: 'already-routed', opportunityId: openOutdoor.id, deletedHandymanDuplicates };
        }

        const openHandyman = opportunities.find((opp: any) =>
            opp.pipelineId === HANDYMAN_PIPELINE_ID &&
            opp.status !== 'lost' &&
            opp.status !== 'abandoned' &&
            isRecentOpportunity(opp, startedAt)
        );

        if (openHandyman) {
            const response = await ghlRequest(`/opportunities/${openHandyman.id}`, apiKey, {
                method: 'PUT',
                body: JSON.stringify({
                    pipelineId: OUTDOOR_PIPELINE_ID,
                    pipelineStageId: OUTDOOR_NEW_LEAD_STAGE_ID,
                    name: opportunityName,
                    status: 'open',
                    source: source || 'Website Form'
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Failed to move opportunity to Ifixx 2026 pipeline: ${err}`);
            }

            return { action: 'moved-from-handyman', opportunityId: openHandyman.id, deletedHandymanDuplicates: [] };
        }
    }

    const response = await ghlRequest('/opportunities/', apiKey, {
        method: 'POST',
        body: JSON.stringify({
            locationId,
            pipelineId: OUTDOOR_PIPELINE_ID,
            pipelineStageId: OUTDOOR_NEW_LEAD_STAGE_ID,
            contactId,
            name: opportunityName,
            status: 'open',
            source: source || 'Website Form',
            monetaryValue: 0
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to create Ifixx 2026 opportunity: ${err}`);
    }

    const result = await response.json();
    const opportunityId = result.opportunity?.id || result.id;

    let deletedHandymanDuplicates: string[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
        await wait(1000);
        deletedHandymanDuplicates = await cleanupRecentHandymanDuplicates({
            apiKey,
            locationId,
            contactId,
            startedAt
        });

        if (deletedHandymanDuplicates.length > 0) {
            break;
        }
    }

    return { action: 'created-outdoor', opportunityId, deletedHandymanDuplicates };
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const requestStartedAt = new Date();
        const data = await request.json();
        const {
            firstName,
            lastName,
            email,
            phone,
            service,
            package: selectedPackage, // Silver/Gold/Platinum from remodeling package CTAs
            message,
            source,
            city,
            zipCode, // Contact postal code (required on lead forms)
            // South Charlotte landing page fields
            issueType,
            safetyConcern,
            landingPage,
            campaignTest,
            photoUploadStatus,
            photoCount,
            // Property Manager specific fields
            segment,
            companyName,
            numberOfProperties,
            propertyTypes,
            bestTimeToContact,
            // UTM & Google Ads tracking
            utm_source,
            utm_medium,
            utm_campaign,
            utm_term,
            utm_content,
            gclid,
            // Google Ads click ids for iOS/app and YouTube traffic, where gclid is absent
            gbraid,
            wbraid,
            // Page identity (sent by every form since 2026-09):
            // page_path   = pathname the form was submitted from
            // landing_page = first page of the attributed visit (may be days earlier)
            page_path,
            landing_page,
            referrer
        } = data;

        // 1. Validation
        // Email is NOT required. /contact marks it optional and the endpoint rejected
        // the submission anyway, so anyone who left it blank got a generic error and
        // iFIXX never saw the lead. A name and a way to call back is a lead.
        if (!firstName || !phone) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing required fields: firstName or phone',
                }),
                { status: 400 }
            );
        }

        const GHL_API_KEY = import.meta.env.GHL_API_KEY;
        const GHL_LOCATION_ID = import.meta.env.GHL_LOCATION_ID;

        if (!GHL_API_KEY || !GHL_LOCATION_ID) {
            console.error('Missing GHL Configuration');
            return new Response(
                JSON.stringify({ success: false, error: 'Server configuration error' }),
                { status: 500 }
            );
        }

        // 2. Build tags array
        const serviceTags = service ? (SERVICE_TAGS[service] || SERVICE_TAGS['other']) : [];

        // Page-origin tags. `form:` is the page the form was submitted from; `landing:`
        // is the first page of the attributed visit, added only when it differs (an ad
        // click that landed elsewhere and converted later on another page).
        const formPath = safePath(page_path);
        const landingPath = safePath(landing_page);
        const formPathSlug = pathSlug(formPath);
        const landingPathSlug = pathSlug(landingPath);
        const originTags = [
            ...(formPathSlug ? [`form:${formPathSlug}`] : []),
            ...(landingPathSlug && landingPathSlug !== formPathSlug ? [`landing:${landingPathSlug}`] : [])
        ];

        const allTags = [
            'website-lead',
            ...serviceTags,
            // Remodeling package chosen on the page (silver|gold|platinum)
            ...(selectedPackage && ['silver', 'gold', 'platinum'].includes(String(selectedPackage)) ? [`package-${selectedPackage}`] : []),
            ...(campaignTest ? [`campaign-${String(campaignTest).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`] : []),
            // 'south-charlotte-test' used to be hard-coded into six SERVICE_TAGS entries,
            // which blocked the site-wide form from reusing those service values. It now
            // follows the campaign that defines the test, which is what it always meant.
            ...(campaignTest === SOUTH_CHARLOTTE_TEST ? ['south-charlotte-test'] : []),
            ...(city ? [`city-${city.toLowerCase().replace(/\s+/g, '-')}`] : []),
            // Add segment-specific tags
            ...(segment === 'property-manager' ? ['segment-property-manager', 'b2b-lead'] : []),
            ...(segment === 'homeowner' ? ['segment-homeowner'] : []),
            ...originTags
        ];

        const enrichedMessage = buildLeadMessage({
            message,
            issueType,
            safetyConcern,
            landingPage,
            campaignTest,
            photoUploadStatus,
            photoCount
        });

        // 3. Build custom fields for additional context
        // GHL Custom Field IDs (from iFIXX location KoSPUTpwwHX6t12vY7TO):
        // Updated 2026-02-05:
        // - HhBO7YQAST3aZR770LJO = Project Notes
        // - 6PzFTQhylccNWI2VtAn7 = Service Needed (multi-select)
        // - 3enbIg3RvepWmNKHDc5N = Contact Preferences
        // - pZTERD3dvBvPEiq0RARf = Lead Source
        // - vwPsQ0pHJcnap7ZtULld = Urgency
        const customFields: { id: string; value: string }[] = [];
        if (enrichedMessage) {
            customFields.push({ id: 'HhBO7YQAST3aZR770LJO', value: enrichedMessage }); // Project Notes
        }
        if (service) {
            customFields.push({ id: '6PzFTQhylccNWI2VtAn7', value: service }); // Service Needed
        }
        // Property Manager specific custom fields
        if (companyName) {
            customFields.push({ id: 'company_name', value: companyName }); // TODO: create in GHL
        }
        if (numberOfProperties) {
            customFields.push({ id: 'number_of_properties', value: numberOfProperties }); // TODO: create in GHL
        }
        if (propertyTypes) {
            customFields.push({ id: 'property_types', value: propertyTypes }); // TODO: create in GHL
        }
        if (bestTimeToContact) {
            customFields.push({ id: '3enbIg3RvepWmNKHDc5N', value: bestTimeToContact }); // Contact Preferences
        }

        // 4. GHL Contact Upsert
        const upsertBody: Record<string, any> = {
            firstName,
            lastName: lastName || '',
            ...(email ? { email } : {}),
            phone,
            locationId: GHL_LOCATION_ID,
            source: source || 'Website Form',
            tags: allTags
        };

        // Map zip code to the contact's postal code (never reject a lead if missing)
        if (zipCode) {
            upsertBody.postalCode = zipCode;
        }

        // Add UTM parameters and GCLID for attribution & offline conversion tracking.
        // These fields are the ones already proven against this GHL location.
        const coreAttribution: Record<string, string> = {
            ...(utm_source && { utmSource: utm_source }),
            ...(utm_medium && { utmMedium: utm_medium }),
            ...(utm_campaign && { utmCampaign: utm_campaign }),
            ...(utm_term && { utmTerm: utm_term }),
            ...(utm_content && { utmContent: utm_content }),
            ...(gclid && { gclid })
        };

        // Page origin + the click ids that replace gclid on iOS/YouTube traffic. Kept
        // separate because they have never been sent to this location: if GHL rejects
        // the payload, the request is retried with the core fields only rather than
        // losing the lead (see upsertContact below).
        //
        // `campaign` is here for the same reason. Verified against this location on
        // 2026-09-17: GHL stores utmSource, utmMedium, utmTerm, gclid and url, but drops
        // utmCampaign, so every paid lead arrived without the campaign that produced it.
        // `campaign` is the field GHL does persist. utmCampaign stays in coreAttribution
        // untouched, so nothing that works today depends on this one being accepted.
        const pageUrl = formPath ? `${new URL(request.url).origin}${formPath}` : '';
        const extendedAttribution: Record<string, string> = {
            ...(pageUrl && { url: pageUrl }),
            ...(referrer && { referrer }),
            ...(utm_campaign && { campaign: utm_campaign }),
            ...(gbraid && { gbraid }),
            ...(wbraid && { wbraid })
        };

        const hasCoreAttribution = Object.keys(coreAttribution).length > 0;
        const hasExtendedAttribution = Object.keys(extendedAttribution).length > 0;

        if (hasCoreAttribution || hasExtendedAttribution) {
            upsertBody.attributionSource = { ...coreAttribution, ...extendedAttribution };
        }

        // Add custom fields if present
        if (customFields.length > 0) {
            upsertBody.customFields = customFields;
        }

        let contactResponse = await upsertContact(GHL_API_KEY, upsertBody);

        // GHL answers 4xx when it dislikes a property in the body. Rather than dropping
        // the lead, retry once with the attribution fields that are known to work.
        if (!contactResponse.ok && contactResponse.status < 500 && hasExtendedAttribution) {
            const err = await contactResponse.text();
            console.warn('GHL rejected extended attributionSource, retrying with core fields:', err);

            const fallbackBody = { ...upsertBody };
            if (hasCoreAttribution) {
                fallbackBody.attributionSource = coreAttribution;
            } else {
                delete fallbackBody.attributionSource;
            }

            contactResponse = await upsertContact(GHL_API_KEY, fallbackBody);
        }

        if (!contactResponse.ok) {
            const err = await contactResponse.text();
            console.error('GHL Upsert Error:', err);
            throw new Error('Failed to create contact in GHL');
        }

        const contactResult = await contactResponse.json();
        const contactId = contactResult.contact?.id || contactResult.id;

        if (!contactId) {
            console.error('GHL Upsert Missing Contact ID:', JSON.stringify(contactResult));
            throw new Error('GHL did not return a contact ID');
        }

        // Route EVERY website lead into the Ifixx 2026 pipeline (New Lead stage),
        // not just deck/fence. This makes the website the single entry point; GHL then
        // reacts to "opportunity created in Ifixx 2026" for notification + AI intake.
        const routing = await routeWebsiteOpportunity({
            apiKey: GHL_API_KEY,
            locationId: GHL_LOCATION_ID,
            contactId,
            firstName,
            lastName,
            service,
            source: source || 'Website Form',
            startedAt: requestStartedAt
        });

        console.log(`Lead created: ${contactId} | Tags: ${allTags.join(', ')} | Ifixx 2026 routing: ${routing.action}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Lead received successfully',
                contactId,
                routing
            }),
            { status: 200 }
        );

    } catch (error) {
        console.error('API Error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Something went wrong. Please call us directly.'
            }),
            { status: 500 }
        );
    }
};
