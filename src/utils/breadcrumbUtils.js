/**
 * Maps route paths to breadcrumb items
 * Implements the custom breadcrumb navigation as specified
 */

// Define route mappings - path to exact title
const routeTitles = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/add-examiner': 'Add New Examiner',
  '/examiners/add': 'Add New Examiner',
  '/examiners': 'Examiner Details',
  '/staff-details': 'Staff Details',
  '/calculation': 'Salary Calculator',
  '/calculations/new': 'Salary Calculator',
  '/calculation-archive': 'Calculation Archive',
  '/pdf-archive': 'PDF Archive',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

// Define routes that shouldn't show breadcrumbs (Dashboard is the homepage)
const hideBreadcrumbRoutes = [
  '/',
  '/dashboard'
];

/**
 * Generate breadcrumb items from a path based on exact specifications
 * @param {string} path - Current path
 * @param {Object} params - URL parameters for dynamic routes
 * @returns {Array} Array of breadcrumb items with path and title
 */
export const generateBreadcrumbs = (path, params = {}) => {
  // Don't show breadcrumbs on Dashboard (homepage)
  if (hideBreadcrumbRoutes.includes(path)) {
    return [];
  }
  
  // Start with Home (which points to Dashboard)
  const breadcrumbs = [
    { 
      path: '/', 
      title: 'Home',
      state: {}  // Initialize with empty state
    }
  ];
  
  // Preserve examiner name in all breadcrumb states
  const commonState = {};
  if (params.examinerName) {
    commonState.examinerName = params.examinerName;
  }
  
  // Handle specific routes according to the defined structure
  if (path === '/profile') {
    // Home > Profile
    breadcrumbs.push({ path: '/profile', title: 'Profile', state: commonState });
  } 
  else if (path === '/add-examiner' || path === '/examiners/add') {
    // Home > Add New Examiner
    breadcrumbs.push({ path: path, title: 'Add New Examiner', state: commonState });
  }
  else if (path.match(/^\/examiners\/edit\/[^/]+$/)) {
    // Home > Edit Examiner Profile
    breadcrumbs.push({ path, title: 'Edit Examiner Profile', state: commonState });
  }
  else if (path.match(/^\/examiners\/[^/]+$/)) {
    // Home > Examiner Details
    const examinerName = params.examinerName || 'Examiner Details';
    breadcrumbs.push({ path, title: examinerName, state: commonState });
  }
  else if (path.match(/^\/examiners\/[^/]+\/edit$/)) {
    // Home > Examiner Details > Edit Examiner Profile
    const examinerId = path.split('/')[2];
    const examinerName = params.examinerName || 'Examiner Details';
    
    breadcrumbs.push({ 
      path: `/examiners/${examinerId}`, 
      title: examinerName,
      state: commonState
    });
    
    breadcrumbs.push({ 
      path, 
      title: 'Edit Examiner Profile',
      state: commonState
    });
  }
  else if (path.match(/^\/examiner\/[^/]+\/history$/)) {
    // Home > Examiner Details > Examiner History
    const examinerId = path.split('/')[2];
    const examinerName = params.examinerName || 'Examiner Details';
    
    breadcrumbs.push({ 
      path: `/examiners/${examinerId}`, 
      title: examinerName,
      state: commonState
    });
    
    breadcrumbs.push({ 
      path, 
      title: 'Examiner History',
      state: commonState
    });
  }
  else if (path.match(/^\/examiner\/[^/]+\/history\/[^/]+$/)) {
    // Home > Examiner Details > Examiner History > Examiner Report
    const examinerId = path.split('/')[2];
    const examinerName = params.examinerName || 'Examiner Details';
    const reportTitle = `${examinerName} Report`;
    
    breadcrumbs.push({ 
      path: `/examiners/${examinerId}`, 
      title: examinerName,
      state: commonState
    });
    
    breadcrumbs.push({ 
      path: `/examiner/${examinerId}/history`, 
      title: 'Examiner History',
      state: commonState
    });
    
    breadcrumbs.push({ 
      path, 
      title: reportTitle,
      state: commonState
    });
  }
  else if (path.match(/^\/calculations\/new\/[^/]+$/)) {
    // Home > Examiner Details > Salary Calculator
    const examinerId = path.split('/')[3];
    const examinerName = params.examinerName || 'Examiner Details';
    const calculatorTitle = `Salary Calculator`;
    
    breadcrumbs.push({ 
      path: `/examiners/${examinerId}`, 
      title: examinerName,
      state: commonState
    });
    
    breadcrumbs.push({ 
      path, 
      title: calculatorTitle,
      state: commonState
    });
  }
  else if (path.match(/^\/calculations\/view\/[^/]+$/)) {
    // Home > Calculation Archive > Examiner Report
    const examinerName = params.examinerName || 'Calculation Details';
    const reportTitle = `${examinerName} Report`;
    
    breadcrumbs.push({ 
      path: '/calculation-archive', 
      title: 'Calculation Archive',
      state: commonState
    });
    
    breadcrumbs.push({ 
      path, 
      title: reportTitle,
      state: commonState
    });
  }
  else if (path.match(/^\/staff-details\/[^/]+$/)) {
    // Home > Examiner > Salary Calculator > Staff Details
    const examinerId = path.split('/')[2];
    const examinerName = params.examinerName || 'Examiner';
    
    // First add examiner link
    breadcrumbs.push({ 
      path: `/examiners/${examinerId}`, 
      title: examinerName,
      state: commonState
    });
    
    // Then add salary calculator link
    breadcrumbs.push({ 
      path: `/calculations/new/${examinerId}`, 
      title: 'Salary Calculator',
      state: {
        ...commonState,
        evaluationDayId: params.evaluationDayId,
        evaluationDate: params.evaluationDate,
        staffCount: params.staffCount,
        examinerData: params.examinerData,
        examinerName: params.examinerName,
        _ts: Date.now() // Add timestamp to ensure useEffect triggers
      }
    });
    
    // Finally add staff details as current page
    breadcrumbs.push({ 
      path, 
      title: 'Staff Details',
      state: commonState
    });
  }
  else if (path === '/settings') {
    // Home > Settings
    breadcrumbs.push({ 
      path: '/settings', 
      title: 'Settings',
      state: commonState
    });
  }
  else if (path === '/calculation-archive') {
    // Home > Calculation Archive
    breadcrumbs.push({ 
      path: '/calculation-archive', 
      title: 'Calculation Archive',
      state: commonState
    });
  }
  else if (path === '/pdf-archive') {
    // Home > PDF Archive
    breadcrumbs.push({ 
      path: '/pdf-archive', 
      title: 'PDF Archive',
      state: commonState
    });
  }
  else {
    // Generic route - fall back to path segments
    const pathSegments = path.split('/').filter(segment => segment);
    let currentPath = '';
    
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const title = routeTitles[currentPath] || 
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      
      breadcrumbs.push({ 
        path: currentPath, 
        title,
        state: commonState
      });
    });
  }
  
  // Add "Favourite" to the end if in favourite mode
  if (params.isFavorite === true) {
    const lastItem = breadcrumbs[breadcrumbs.length - 1];
    breadcrumbs[breadcrumbs.length - 1] = {
      ...lastItem,
      title: `${lastItem.title} > Favourite`
    };
  }
  
  return breadcrumbs;
};

// Memoization cache for breadcrumb items to prevent recalculation
const breadcrumbCache = new Map();

/**
 * Get breadcrumb items for a specific route with caching
 * @param {string} path - Current path
 * @param {Object} params - Optional parameters to include in breadcrumbs
 * @returns {Array} Array of breadcrumb items
 */
export const getBreadcrumbItems = (path, params = {}) => {
  // Create a cache key from path and serialized params
  const cacheKey = `${path}-${JSON.stringify(params)}`;
  
  // Check if we have this result cached
  if (breadcrumbCache.has(cacheKey)) {
    return breadcrumbCache.get(cacheKey);
  }
  
  // Generate breadcrumbs if not cached
  const breadcrumbs = generateBreadcrumbs(path, params);
  
  // Cache the result (limit cache size to prevent memory issues)
  if (breadcrumbCache.size > 100) {
    // Clear the oldest entry if cache is too large
    const firstKey = breadcrumbCache.keys().next().value;
    breadcrumbCache.delete(firstKey);
  }
  
  breadcrumbCache.set(cacheKey, breadcrumbs);
  return breadcrumbs;
}; 