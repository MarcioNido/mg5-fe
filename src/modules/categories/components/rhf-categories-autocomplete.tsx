import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {titleCase} from "tiny-case";
import {CategoryResource} from "common/types/categories";
import {Categories} from "../../../common/apis/Categories";
import {RHFAutocomplete} from "../../../components/hook-form";
import Iconify from "../../../components/iconify";
import useParseCategoriesList from "../../../hooks/use-parse-categories-list";

interface Props {
    name: string;
    label: string;
    maxLevel: number;
}
export default function RhfCategoriesAutocomplete({ name, label, maxLevel }: Props) {
    const [parsedCategoriesList, setParsedCategoriesList] = React.useState<CategoryResource[]>([]);
    const parseCategoriesList = useParseCategoriesList();

    React.useEffect(() => {
        Categories.getAll({
            filters: [{ column: 'level', operator: 'lte', value: 1}],
            orderBy: [{ column: 'name', direction: 'asc' }],
        }).then((res) => setParsedCategoriesList(parseCategoriesList(res.data, maxLevel)));
    }, [maxLevel, parseCategoriesList]);

    return (
        <RHFAutocomplete
            name={name}
            label={label}
            options={parsedCategoriesList.map((option) => option) as CategoryResource[]}
            getOptionLabel={(option) => (typeof option === 'string' ? option : titleCase(option.name))}
            fullWidth
            renderOption={(props, option) => (
                <>
                    <li {...props} key={option.id}>
                        {
                            [...Array(option.level - 1)].map((e,i) =>
                                <Iconify key={i} icon="eva:chevron-right-fill" sx={{ verticalAlign: 'middle', mr: 3 }} />
                            )
                        }
                        {titleCase(option.name)}
                    </li>
                </>
            )}
        />
    );
}
