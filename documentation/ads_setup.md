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
- **Status**: Replaced with Ezoic integration (June 2025)
- **Reason**: Malicious redirects detected in ad content
- **Action Taken**: Removed all Adstera ads and replaced with Ezoic's ad management system
- **Security Note**: Terminated due to security concerns, replaced with more secure Ezoic platform

### EzoicAds Integration
- **Status**: Active (Implemented June 2025)
- **Implementation**: Direct integration with Ezoic's ad management system
- **Ad Placements**: Strategic placement IDs managed through Ezoic dashboard
- **Features**: 
  - Privacy compliance with gatekeeper consent management
  - Optimized ad loading and delivery
  - Multiple ad placement support with batch loading

## Technical Implementation

### Ezoic Integration
The site now uses EzoicAds for direct ad management with the following implementation:

#### Header Scripts
- **Privacy Scripts**: Gatekeeper consent management for GDPR/CCPA compliance
- **Ezoic Header Script**: Main ad management initialization
- **Placement Strategy**: Strategic ad placement IDs (101, 102, 103, 104) for optimal performance

#### Ad Placement Structure
```html
<div id="ezoic-pub-ad-placeholder-[ID]"></div>
<script>
    ezstandalone.cmd.push(function() {
        ezstandalone.showAds([ID])
    });
</script>
```

#### Performance Optimization
- Multiple ad IDs passed to single showAds() call to reduce server requests
- Batch loading: `ezstandalone.showAds(101, 102, 103, 104)`
- No styling applied to placeholder divs to prevent layout issues

### Route Handling
- Server redirects `/ads.txt` requests to Ezoic's Ads.txt Manager
- No local file management required
- Centralized control through Ezoic platform

### Security Measures
- Regular monitoring of ad content for malicious behavior
- Immediate removal of problematic ad networks
- User safety prioritized over revenue

## Implementation Details

### File Structure
```
views/
├── components/
│   └── header.ejs          # Contains Ezoic scripts and ad placements
public/
├── styles.css              # Main CSS with ad positioning styles
└── js/
    └── adManager.js         # Legacy ad manager (currently disabled)
```

### Ad Placement Configuration
The current implementation uses four strategic ad placements:

1. **Mobile Top Banner (ID: 101)**
   - Position: Fixed top of screen on mobile devices
   - Container: `ezoic-pub-ad-placeholder-101`
   - Visibility: Mobile only (hidden on desktop ≥1400px)

2. **Desktop Left Sidebar (ID: 102)**
   - Position: Fixed left sidebar on desktop
   - Container: `ezoic-pub-ad-placeholder-102`
   - Message: "We never collect or sell your data"
   - Visibility: Desktop only (≥1400px)

3. **Desktop Right Sidebar (ID: 103)**
   - Position: Fixed right sidebar on desktop
   - Container: `ezoic-pub-ad-placeholder-103`
   - Message: "These ads help keep FreeYap free"
   - Visibility: Desktop only (≥1400px)

4. **Mobile Bottom Banner (ID: 104)**
   - Position: Fixed bottom of screen on mobile devices
   - Container: `ezoic-pub-ad-placeholder-104`
   - Visibility: Mobile only (hidden on desktop ≥1400px)

### Responsive Design
- **Desktop (≥1400px)**: Shows sidebar ads (102, 103), hides mobile banners
- **Mobile/Tablet (<1400px)**: Shows mobile banners (101, 104), hides sidebar ads
- **Content Layout**: Automatically adjusts margins to prevent ad overlap

### Performance Optimizations
- **Batch Loading**: All ad IDs passed to single `showAds()` call
- **Lazy Loading**: Ads only initialize after page load
- **Mobile Optimization**: Reduced ad frequency on smaller screens

## Troubleshooting

### Common Issues

1. **Ads Not Displaying**
   - Verify Ezoic dashboard has approved ad placements
   - Check browser console for JavaScript errors
   - Ensure ad blocker is not interfering

2. **Layout Issues**
   - Verify CSS media queries are working correctly
   - Check for conflicting styles in custom CSS files
   - Ensure proper z-index values for fixed positioning

3. **Mobile Display Problems**
   - Test on actual mobile devices, not just browser dev tools
   - Verify viewport meta tag is properly configured
   - Check CSS responsive breakpoints

### Testing Checklist
- [ ] Desktop sidebar ads appear on screens ≥1400px
- [ ] Mobile banner ads appear on screens <1400px
- [ ] Content layout adjusts properly with ads
- [ ] Core application functionality works (spell checker, forms, etc.)
- [ ] Privacy scripts load before ad scripts
- [ ] Ads don't interfere with site functionality

### Expected Console Messages During Development

When testing locally, you may see these **expected** console errors:

```
min.js:1 Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
cmp.min.js:1 Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
cdn.id5-sync.com/api/1.0/id5-api.js:1 Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
```

**These are normal and expected** - they indicate:
- Ad blockers or privacy extensions are working
- The Ezoic scripts are properly attempting to load
- The integration is correctly implemented
- Core application functionality remains unaffected

### Production vs Development Behavior
- **Development**: Ad scripts may be blocked by browser extensions
- **Production**: Ads will load normally for users without ad blockers
- **Testing**: Disable ad blocker temporarily to verify ad loading in development

## Migration from Adstera

The migration from Adstera to Ezoic involved:

1. **Removal of Adstera Scripts**
   - Removed all Adstera JavaScript includes
   - Disabled legacy `adManager.js` functionality
   - Cleaned up old ad container HTML

2. **Implementation of Ezoic System**
   - Added Gatekeeper consent management scripts
   - Integrated Ezoic standalone ad loader
   - Created new responsive ad placement structure

3. **Security Improvements**
   - Eliminated malicious redirect risks
   - Implemented proper consent management
   - Added privacy-focused messaging

### Legacy Code Cleanup
The old Adstera integration code remains in place but is disabled:
- `adManager.js`: Contains legacy ad management logic (commented out)
- All Adstera-specific containers and scripts have been removed
- CSS styles have been updated to support new ad placements

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
