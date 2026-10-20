import type { APIRoute } from 'astro';
// The CRM intake core (tags, upsert body, upsert with fallback, Ifixx 2026 routing)
// lives in src/lib/lead-intake.ts so other server endpoints can reuse it.
import { submitLead } from '../../lib/lead-intake';

export const prerender = false;

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

        // Everything below used to live inline here; it moved verbatim to submitLead.
        // extraTags / notesPrefix are not taken from the browser payload.
        const { contactId, tags: allTags, routing } = await submitLead(
            {
                firstName,
                lastName,
                email,
                phone,
                service,
                package: selectedPackage,
                message,
                source,
                city,
                zipCode,
                issueType,
                safetyConcern,
                landingPage,
                campaignTest,
                photoUploadStatus,
                photoCount,
                segment,
                companyName,
                numberOfProperties,
                propertyTypes,
                bestTimeToContact,
                utm_source,
                utm_medium,
                utm_campaign,
                utm_term,
                utm_content,
                gclid,
                gbraid,
                wbraid,
                page_path,
                landing_page,
                referrer
            },
            { apiKey: GHL_API_KEY, locationId: GHL_LOCATION_ID, origin: new URL(request.url).origin },
            requestStartedAt
        );

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
