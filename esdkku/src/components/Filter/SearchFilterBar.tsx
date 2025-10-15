"use client";

import React, { useState, useEffect } from 'react';
import InputStyle from '../Form/InputStyle';
import SelectStyle from '../Form/SelectStyle';
import { FilterList } from '@/const/enum';
import { DocumentRow } from '@/types/documentType';
import { useUserStore } from '@/stores/useUserStore';
import { CloseOutlined, SearchOutlined } from "@ant-design/icons"
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

//config
import { filterListOfficerMail } from '@/config/filterListOptions';
import { filterListUserMail } from '@/config/filterListOptions';
import { updateQuery } from '@/utils/updateQuety';

interface SearchFilterBarProps {
    className?: string;
    placeholder?: string;
    dataValues: DocumentRow[];
    setNewData: React.Dispatch<React.SetStateAction<DocumentRow[] | null>>;
    // onSearch?: (searchTerm: string, filters: Record<string, string | number>) => void;
    // onClear?: () => void;
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
    className,
    placeholder = "ค้นหา...",
    dataValues,
    setNewData,
}) => {

    //router
    const router = useRouter();
    const pathname = usePathname()

    //store 
    const { user } = useUserStore();

    //search params
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const statusQuery = searchParams.get('status') || '';

    //state
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const [filterValues, setFilterValues] = useState<Record<string, string | number>>({
        [FilterList.STATUS]: statusQuery,
    });

    useEffect(() => {
        let data = dataValues || [];

        if (filterValues && Object.keys(filterValues).length > 0) {
            data = data.filter((item) => {
                return Object.entries(filterValues).every(([key, value]) => {
                    if (!value) return true;
                    if (key === FilterList.STATUS) {
                        return item.status.toString() === value.toString();
                    }
                    return true;
                });
            });
        }

        const keyword = searchQuery.trim() !== "" ? searchQuery : searchTerm.trim();
        if (keyword !== "") {
            const lower = keyword.toLowerCase();
            data = data.filter(
                (item) =>
                    item.firstName?.toLowerCase().includes(lower) ||
                    item.lastName?.toLowerCase().includes(lower) ||
                    item.title?.toLowerCase().includes(lower)
            );
        }

        setNewData((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) {
                return data;
            }
            return prev;
        });
    }, [dataValues, filterValues, searchTerm, searchQuery, statusQuery]);

    const handleFilterChange = (key: string, value: string | number) => {
        setFilterValues(prev => ({ ...prev, [key]: value }));
        updateQuery(router, pathname, searchParams, {
            status: key === FilterList.STATUS
                ? String(value)
                : (filterValues[FilterList.STATUS]?.toString() ?? ""),
            page: "1"
        })
    };

    const handleSearchClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        // if (onSearch) onSearch(searchTerm, filterValues);
        updateQuery(router, pathname, searchParams, {
            status: filterValues[FilterList.STATUS]?.toString() || '',
            search: searchTerm,
            page: "1"
        })
    };

    const handleClearClick = () => {
        setSearchTerm("");
        setFilterValues({});
        // if (onClear) onClear();
        updateQuery(router, pathname, searchParams, {
            search: "",
            status: "",
            page: "1"
        });
    };

    const handleClearSearch = () => {
        updateQuery(router, pathname, searchParams, {
            search: ""
        });
        setSearchTerm("");
    };

    const filterOptions = user?.role === 2 ? filterListOfficerMail : filterListUserMail;

    return (
        <form
            className={`${className} flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm`}
        >
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <InputStyle
                        type="text"
                        value={searchTerm ?? ""}
                        setValue={setSearchTerm}
                        placeholder={placeholder || "พิมพ์คำค้นหา..."}
                        className="w-full py-2 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-custom-color-main focus:outline-none"
                    />
                </div>

                <button
                    onClick={handleSearchClick}
                    className="px-2 py-2.5 lg:py-2  flex items-center gap-2 border-custom  justify-center cursor-pointer"
                    style={{ borderColor: "var(--color-gray-300)" }}
                >
                    <SearchOutlined className="text-base" />
                    <span className='hidden lg:block'>ค้นหา</span>

                </button>
            </div>

            <div className="flex flex-wrap items-center  gap-3">
                {filterValues &&
                    Object.entries(filterOptions).map(([filterName, options]) => (
                        <SelectStyle
                            key={filterName}
                            options={options}
                            value={filterValues[filterName] || ""}
                            onChange={(val) => handleFilterChange(filterName, val)}
                            placeholder={`เลือก${filterName}`}
                            className="min-w-[180px]"
                        />
                    ))}
            </div>

            {searchQuery || statusQuery ? (
                <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                        <div onClick={handleClearSearch} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-sm shadow-sm cursor-pointer">
                            <span>ค้นหา: {searchQuery}</span>
                            <CloseOutlined className="cursor-pointer text-xs hover:text-blue-900" />
                        </div>
                    )}
                    {statusQuery && (
                        <div onClick={handleClearClick} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-sm shadow-sm cursor-pointer">
                            <span>ล้างการค้นหา</span>
                        </div>
                    )}
                    {/* {statusQuery && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-sm shadow-sm">
                        <span>สถานะเอกสาร: {filterOptions[FilterList.STATUS].find(item => item.key.toString() === statusQuery.toString())?.value}</span>
                        <CloseOutlined className="cursor-pointer text-xs hover:text-red-900" />
                    </div>
                )} */}
                </div>
            ) : null}
        </form>
    );
};

export default SearchFilterBar;
