# Ads Setup Documentation

## Overview
FreeYap uses multiple advertising partners to monetize the platform while maintaining user experience and security standards.

## Current Ad Partners

### Ezoic
- **Status**: Active
- **Role**: Primary ad management platform
- **Features**: 
  - Manages ads.txt file automatically
  - Provides ads.txt Manager interface
  - Handles ad optimization and placement

### Google AdSense
- **Status**: Application submitted, pending approval
- **Type**: Contextual advertising network
- **Integration**: Will be managed through Ezoic once approved

### Media.net
- **Status**: Application submitted, pending approval  
- **Type**: Contextual advertising network
- **Integration**: Will be managed through Ezoic once approved

## Ads.txt Management

### Current Setup
- **No local ads.txt file**: The server does not host an ads.txt file locally
- **Redirect implementation**: Requests to `/ads.txt` are redirected to Ezoic's Ads.txt Manager
- **Management**: All ads.txt entries are managed through Ezoic's web interface

### Adding New Vendors
1. Log into Ezoic dashboard
2. Navigate to Ads.txt Manager
3. Add new vendor entries as needed
4. Changes are automatically reflected on the redirect endpoint

## Deprecated Partners

### Adstera
- **Status**: Discontinued
- **Reason**: Malicious redirects detected in ad content
- **Action Taken**: Removed from all ad placements and ads.txt entries
- **Security Note**: Terminated due to security concerns affecting user experience

## Technical Implementation

### Route Handling
- Server redirects `/ads.txt` requests to Ezoic's Ads.txt Manager
- No local file management required
- Centralized control through Ezoic platform

### Security Measures
- Regular monitoring of ad content for malicious behavior
- Immediate removal of problematic ad networks
- User safety prioritized over revenue

## Best Practices

1. **Vendor Vetting**: Thoroughly research new ad partners before integration
2. **Security Monitoring**: Regularly check for malicious redirects or suspicious ad behavior
3. **User Experience**: Ensure ads don't negatively impact site performance or user experience
4. **Compliance**: Maintain proper ads.txt entries for all active advertising partners

## Future Considerations

- Monitor approval status of pending applications (Google AdSense, Media.net)
- Evaluate additional ad networks as traffic grows
- Consider implementing additional security measures for ad content validation
- Regular review of ad performance and user feedback
