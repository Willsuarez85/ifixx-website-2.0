import type { APIRoute } from 'astro';

export const prerender = false;

// Tag mapping by service type - GHL workflows will use these to route leads
// Pipeline routing: handyman (includes urgent) OR remodeling
const SERVICE_TAGS: Record<string, string[]> = {
    // Handyman Services → Pipeline: Handyman
    'plumbing': ['service-plumbing', 'handyman'],
    'electrical': ['service-electrical', 'handyman'],
    'carpentry': ['service-carpentry', 'handyman'],
    'painting': ['service-painting', 'handyman'],
    'doors-windows': ['service-doors-windows', 'handyman'],
    'general-repairs': ['service-general-repairs', 'handyman'],

    // South Charlotte service test landings → Pipeline: Handyman
    'drywall-repair': ['service-drywall-repair', 'service-painting', 'handyman', 'south-charlotte-test'],
    'deck-repair': ['service-deck-repair', 'service-carpentry', 'handyman', 'south-charlotte-test'],
    'interior-painting': ['service-painting', 'service-drywall-repair', 'handyman', 'south-charlotte-test'],

    // Emergency/Urgent Services → Pipeline: Handyman (with urgent flag)
    'emergency-plumbing': ['emergency-plumbing', 'handyman', 'urgent'],
    'emergency-electrical': ['emergency-electrical', 'handyman', 'urgent'],
    'roof-leak': ['emergency-roof-leak', 'handyman', 'urgent'],

    // Remodeling Services → Pipeline: Remodeling
    'kitchen-remodel': ['project-kitchen', 'remodeling'],
    'bathroom-remodel': ['project-bathroom', 'remodeling'],

    // Specialty Services → Pipeline: Handyman
    'pressure-washing': ['service-pressure-washing', 'handyman'],
    'drywall': ['service-drywall', 'handyman'],

    // Default → Pipeline: Handyman
    'other': ['general-inquiry', 'handyman']
};

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

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const {
            firstName,
            lastName,
            email,
            phone,
            service,
            message,
            source,
            city,
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
            gclid
        } = data;

        // 1. Validation
        if (!firstName || !email || !phone) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing required fields: firstName, email, or phone',
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
        const allTags = [
            'website-lead',
            ...serviceTags,
            ...(campaignTest ? [`campaign-${String(campaignTest).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`] : []),
            ...(city ? [`city-${city.toLowerCase().replace(/\s+/g, '-')}`] : []),
            // Add segment-specific tags
            ...(segment === 'property-manager' ? ['segment-property-manager', 'b2b-lead'] : []),
            ...(segment === 'homeowner' ? ['segment-homeowner'] : [])
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
            email,
            phone,
            locationId: GHL_LOCATION_ID,
            source: source || 'Website Form',
            tags: allTags
        };

        // Add UTM parameters and GCLID for attribution & offline conversion tracking
        if (utm_source || utm_medium || utm_campaign || utm_term || utm_content || gclid) {
            upsertBody.attributionSource = {
                ...(utm_source && { utmSource: utm_source }),
                ...(utm_medium && { utmMedium: utm_medium }),
                ...(utm_campaign && { utmCampaign: utm_campaign }),
                ...(utm_term && { utmTerm: utm_term }),
                ...(utm_content && { utmContent: utm_content }),
                ...(gclid && { gclid })
            };
        }

        // Add custom fields if present
        if (customFields.length > 0) {
            upsertBody.customFields = customFields;
        }

        const contactResponse = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            },
            body: JSON.stringify(upsertBody)
        });

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

        console.log(`Lead created: ${contactId} | Tags: ${allTags.join(', ')}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Lead received successfully',
                contactId
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
