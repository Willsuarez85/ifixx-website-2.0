import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { firstName, lastName, email, phone, service, message, source } = data;

        // 1. Validation
        if (!firstName || !email || !phone || !service) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing required fields: firstName, email, phone, or service',
                }),
                { status: 400 }
            );
        }

        const GHL_API_KEY = import.meta.env.GHL_API_KEY;
        const GHL_LOCATION_ID = import.meta.env.GHL_LOCATION_ID;
        if (!GHL_API_KEY || !GHL_LOCATION_ID) {
            console.error('Missing GHL Configuration');
            return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), { status: 500 });
        }

        // 2. Service Logic Mapping (Hubs, Pipelines, Tags)
        // TODO: Replace these PLACEHOLDER IDs with actual GHL Pipeline and Stage IDs
        const SERVICE_MAP: Record<string, any> = {
            // Hub 1: Handyman Services
            'plumbing': { tag: 'service-plumbing', pipelineId: 'PIPELINE_HANDYMAN_ID', stageId: 'STAGE_NEW_LEAD_ID' },
            'electrical': { tag: 'service-electrical', pipelineId: 'PIPELINE_HANDYMAN_ID', stageId: 'STAGE_NEW_LEAD_ID' },
            'carpentry': { tag: 'service-carpentry', pipelineId: 'PIPELINE_HANDYMAN_ID', stageId: 'STAGE_NEW_LEAD_ID' },
            'painting': { tag: 'service-painting', pipelineId: 'PIPELINE_HANDYMAN_ID', stageId: 'STAGE_NEW_LEAD_ID' },

            // Hub 2: Emergency Services
            'emergency-plumbing': { tag: 'emergency-plumbing', pipelineId: 'PIPELINE_EMERGENCY_ID', stageId: 'STAGE_URGENT_ID' },
            'roof-leak': { tag: 'emergency-roofing', pipelineId: 'PIPELINE_EMERGENCY_ID', stageId: 'STAGE_URGENT_ID' },

            // Hub 3: Remodeling
            'kitchen-remodel': { tag: 'project-kitchen', pipelineId: 'PIPELINE_REMODEL_ID', stageId: 'STAGE_INQUIRY_ID' },
            'bathroom-remodel': { tag: 'project-bathroom', pipelineId: 'PIPELINE_REMODEL_ID', stageId: 'STAGE_INQUIRY_ID' },

            // Fallback
            'default': { tag: 'website-lead', pipelineId: 'PIPELINE_GENERAL_ID', stageId: 'STAGE_NEW_LEAD_ID' }
        };

        const serviceConfig = SERVICE_MAP[service] || SERVICE_MAP['default'];

        // 3. GHL Contact Upsert
        const upsertBody = {
            firstName,
            lastName: lastName || '',
            email,
            phone,
            locationId: GHL_LOCATION_ID,
            source: source || 'Website',
            tags: [serviceConfig.tag, 'website-lead']
        };

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
            throw new Error('Failed to create/update contact in GHL');
        }

        const contactResult = await contactResponse.json();
        const contactId = contactResult.contact?.id;

        // 4. Create Opportunity
        if (contactId && serviceConfig.pipelineId !== 'PIPELINE_GENERAL_ID') {
            try {
                const oppBody = {
                    pipelineId: serviceConfig.pipelineId,
                    pipelineStageId: serviceConfig.stageId,
                    locationId: GHL_LOCATION_ID,
                    name: `${firstName} ${lastName || ''} - ${service}`,
                    contactId: contactId,
                    status: 'open'
                };

                await fetch('https://services.leadconnectorhq.com/opportunities/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GHL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Version': '2021-07-28'
                    },
                    body: JSON.stringify(oppBody)
                });
            } catch (oppError) {
                console.error('GHL Opportunity Error (non-blocking):', oppError);
            }
        }


        return new Response(
            JSON.stringify({
                success: true,
                message: 'Lead processed successfully',
                contactId
            }),
            { status: 200 }
        );

    } catch (error) {
        console.error('API Error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Internal Server Error'
            }),
            { status: 500 }
        );
    }
};
