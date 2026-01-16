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

    // Emergency/Urgent Services → Pipeline: Handyman (with urgent flag)
    'emergency-plumbing': ['emergency-plumbing', 'handyman', 'urgent'],
    'emergency-electrical': ['emergency-electrical', 'handyman', 'urgent'],
    'roof-leak': ['emergency-roof-leak', 'handyman', 'urgent'],

    // Remodeling Services → Pipeline: Remodeling
    'kitchen-remodel': ['project-kitchen', 'remodeling'],
    'bathroom-remodel': ['project-bathroom', 'remodeling'],

    // Default → Pipeline: Handyman
    'other': ['general-inquiry', 'handyman']
};

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
            // Property Manager specific fields
            segment,
            companyName,
            numberOfProperties,
            propertyTypes,
            bestTimeToContact
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
            ...(city ? [`city-${city.toLowerCase().replace(/\s+/g, '-')}`] : []),
            // Add segment-specific tags
            ...(segment === 'property-manager' ? ['segment-property-manager', 'b2b-lead'] : []),
            ...(segment === 'homeowner' ? ['segment-homeowner'] : [])
        ];

        // 3. Build custom fields for additional context
        const customFields: { id: string; value: string }[] = [];
        if (message) {
            customFields.push({ id: 'message', value: message });
        }
        if (service) {
            customFields.push({ id: 'service_requested', value: service });
        }
        // Property Manager specific custom fields
        if (companyName) {
            customFields.push({ id: 'company_name', value: companyName });
        }
        if (numberOfProperties) {
            customFields.push({ id: 'number_of_properties', value: numberOfProperties });
        }
        if (propertyTypes) {
            customFields.push({ id: 'property_types', value: propertyTypes });
        }
        if (bestTimeToContact) {
            customFields.push({ id: 'best_time_to_contact', value: bestTimeToContact });
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
        const contactId = contactResult.contact?.id;

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
