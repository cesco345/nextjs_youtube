import Link from "next/link";

interface MenuItem {
  name: string;
  path: string;
}

interface DropdownMenuProps {
  items: MenuItem[];
  currentPath: string;
  onItemClick: () => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  currentPath,
  onItemClick,
}) => (
  <div className="absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
    <div className="py-1" role="menu">
      {items.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`block px-4 py-2 text-sm ${
            currentPath === item.path
              ? "bg-gray-100 text-gray-900"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={onItemClick}
        >
          {item.name}
        </Link>
      ))}
    </div>
  </div>
);

export default DropdownMenu;
