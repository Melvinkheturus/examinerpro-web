import React from 'react';
import {
  House,
  Calculator,
  Files,
  User,
  Gear,
  Plus,
  MagnifyingGlass,
  Camera,
  Eye,
  EyeClosed,
  CaretRight,
  X,
  Hamburger,
  ArrowRight,
  Check,
  Warning,
  Info
} from 'phosphor-react';

/**
 * IllustratedIcons component - A centralized place for all illustrated icons
 * 
 * @param {string} name - The name of the icon to render
 * @param {object} props - Additional props to pass to the icon
 * @returns {JSX.Element} The requested icon
 */
export const IllustratedIcon = ({ name, size = 24, weight = "regular", ...props }) => {
  const icons = {
    // Navigation icons
    home: <House size={size} weight={weight} {...props} />,
    calculator: <Calculator size={size} weight={weight} {...props} />,
    document: <Files size={size} weight={weight} {...props} />,
    profile: <User size={size} weight={weight} {...props} />,
    settings: <Gear size={size} weight={weight} {...props} />,
    
    // Action icons
    plus: <Plus size={size} weight={weight} {...props} />,
    search: <MagnifyingGlass size={size} weight={weight} {...props} />,
    camera: <Camera size={size} weight={weight} {...props} />,
    eyeOpen: <Eye size={size} weight={weight} {...props} />,
    eyeClosed: <EyeClosed size={size} weight={weight} {...props} />,
    chevronRight: <CaretRight size={size} weight={weight} {...props} />,
    close: <X size={size} weight={weight} {...props} />,
    menu: <Hamburger size={size} weight={weight} {...props} />,
    arrowRight: <ArrowRight size={size} weight={weight} {...props} />,
    
    // Status icons
    success: <Check size={size} weight={weight} {...props} />,
    warning: <Warning size={size} weight={weight} {...props} />,
    info: <Info size={size} weight={weight} {...props} />
  };

  // Return the requested icon or null if not found
  return icons[name] || null;
};

// Export individual icons for direct import
export const HomeIcon = (props) => <IllustratedIcon name="home" {...props} />;
export const CalculatorIcon = (props) => <IllustratedIcon name="calculator" {...props} />;
export const DocumentIcon = (props) => <IllustratedIcon name="document" {...props} />;
export const ProfileIcon = (props) => <IllustratedIcon name="profile" {...props} />;
export const SettingsIcon = (props) => <IllustratedIcon name="settings" {...props} />;
export const PlusIcon = (props) => <IllustratedIcon name="plus" {...props} />;
export const SearchIcon = (props) => <IllustratedIcon name="search" {...props} />;
export const CameraIcon = (props) => <IllustratedIcon name="camera" {...props} />;
export const EyeOpenIcon = (props) => <IllustratedIcon name="eyeOpen" {...props} />;
export const EyeClosedIcon = (props) => <IllustratedIcon name="eyeClosed" {...props} />;
export const ChevronRightIcon = (props) => <IllustratedIcon name="chevronRight" {...props} />;
export const CloseIcon = (props) => <IllustratedIcon name="close" {...props} />;
export const MenuIcon = (props) => <IllustratedIcon name="menu" {...props} />;
export const ArrowRightIcon = (props) => <IllustratedIcon name="arrowRight" {...props} />;
export const SuccessIcon = (props) => <IllustratedIcon name="success" {...props} />;
export const WarningIcon = (props) => <IllustratedIcon name="warning" {...props} />;
export const InfoIcon = (props) => <IllustratedIcon name="info" {...props} />; 