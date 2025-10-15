import React, { useEffect, useState } from "react";
import { CloseOutlined } from "@ant-design/icons";
import ProfileDisplay from "../Display/ProfileDisplay/ProfileDisplay";

interface OptionItem {
    key: number | string;
    name: string;
    email: string;
    avatar?: string;
}

interface InputAutocompleteProps {
    label?: string;
    value: number | string | null;
    setValue: (key: string | number | null) => void;
    options: OptionItem[];
    className?: string;
    placeholder?: string;
    isRequired?: boolean;
}

const InputAutocomplete: React.FC<InputAutocompleteProps> = ({
    label,
    value,
    setValue,
    options,
    className = "w-full",
    placeholder = "",
    isRequired = false,
}) => {
    const [inputText, setInputText] = useState("");
    const [filteredOptions, setFilteredOptions] = useState<OptionItem[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedOption, setSelectedOption] = useState<OptionItem | null>(null);

    useEffect(() => {
        if (value === null) {
            setSelectedOption(null);
            setInputText("");
        } else {
            const found = options.find((opt) => opt.key === value);
            if (found) {
                setSelectedOption(found);
                setInputText(`${found.name} <${found.email}>`);
            }
        }
    }, [value, options]);

    const handleChange = (text: string) => {
        setInputText(text);
        setSelectedOption(null);
        setValue(null);

        if (text.length > 0) {
            const filtered = options.filter(
                (opt) =>
                    opt.name.toLowerCase().includes(text.toLowerCase()) ||
                    opt.email.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredOptions(filtered);
            setShowDropdown(filtered.length > 0);
        } else {
            setShowDropdown(false);
        }
    };

    const handleSelect = (option: OptionItem) => {
        setInputText(`${option.name} <${option.email}>`);
        setSelectedOption(option);
        setValue(option.key);
        setShowDropdown(false);
    };

    const clearSelection = () => {
        setInputText("");
        setSelectedOption(null);
        setValue(null);
    };

    return (
        <div className="relative">
            {label && (
                <label className="block text-gray-700 font-medium mb-1">
                    {label}&nbsp;
                    {isRequired && <span className="text-red-400 text-xs">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    type="text"
                    value={inputText}
                    placeholder={placeholder}
                    className={`custom-input-style rounded-md ring-custom-color-main ${className} pr-8`}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={() => setShowDropdown(filteredOptions.length > 0)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
                    readOnly={!!selectedOption}
                />

                {selectedOption && (
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={clearSelection}
                    >
                        <CloseOutlined className="text-gray-500" />
                    </button>
                )}
            </div>

            {showDropdown && !selectedOption && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-52 overflow-y-auto shadow-md">
                    {filteredOptions.map((option) => (
                        <li
                            key={option.key}
                            className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100"
                            onMouseDown={() => handleSelect(option)}
                        >
                            <ProfileDisplay profileImage={option.avatar || ''} name={option.name} email={option.email} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default InputAutocomplete;