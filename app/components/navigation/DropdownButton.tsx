interface DropdownButtonProps {
  title: string;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
}

const DropdownButton: React.FC<DropdownButtonProps> = ({
  title,
  isActive,
  isOpen,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center h-full px-3 border-b-2 text-lg font-medium whitespace-nowrap ${
      isActive
        ? "border-blue-500 text-gray-900"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
    }`}
  >
    {title}
    <svg
      className={`ml-2 h-4 w-4 transition-transform ${
        isOpen ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  </button>
);

export default DropdownButton;
