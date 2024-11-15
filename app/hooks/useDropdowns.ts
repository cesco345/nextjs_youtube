import { useState, useRef, useEffect } from "react";

interface DropdownState {
  [key: string]: boolean;
}

export const useDropdowns = (initialCategories: string[]) => {
  const [dropdowns, setDropdowns] = useState<DropdownState>(
    initialCategories.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(dropdownRefs.current).forEach(([key, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setDropdowns((prev) => ({ ...prev, [key]: false }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (key: string) => {
    setDropdowns((prev) => ({
      ...Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {}),
      [key]: !prev[key],
    }));
  };

  return { dropdowns, dropdownRefs, toggleDropdown };
};
