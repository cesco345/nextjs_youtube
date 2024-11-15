"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationCategories } from "../config/navigationConfig";
import { useDropdowns } from "../hooks/useDropdowns";
import DropdownButton from "./navigation/DropdownButton";
import DropdownMenu from "./navigation/DropdownMenu";

const Navigation = () => {
  const pathname = usePathname();
  const { dropdowns, dropdownRefs, toggleDropdown } = useDropdowns(
    Object.keys(navigationCategories)
  );

  const renderDropdown = (
    key: string,
    category: (typeof navigationCategories)[keyof typeof navigationCategories]
  ) => (
    <div
      className="relative h-full"
      ref={(el) => {
        if (el) dropdownRefs.current[key] = el;
      }}
      key={key}
    >
      <DropdownButton
        title={category.title}
        isActive={pathname.startsWith(`/opencv/${key}`) || dropdowns[key]}
        isOpen={dropdowns[key]}
        onClick={() => toggleDropdown(key)}
      />

      {dropdowns[key] && (
        <DropdownMenu
          items={category.items}
          currentPath={pathname}
          onItemClick={() => toggleDropdown(key)}
        />
      )}
    </div>
  );

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-center">
          <div className="flex items-center">
            <Link href="/" className="text-3xl font-bold text-gray-800 mr-8">
              STEM&#8209;APKs
            </Link>

            <div className="flex items-center space-x-6">
              <Link
                href="/"
                className={`inline-flex items-center h-full px-3 border-b-2 text-lg font-medium ${
                  pathname === "/"
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Home
              </Link>
              {Object.entries(navigationCategories).map(([key, category]) =>
                renderDropdown(key, category)
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
