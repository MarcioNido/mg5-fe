import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {titleCase} from "tiny-case";
import {RHFAutocomplete} from "../../../components/hook-form";
import {AccountResource} from "../../../common/types/accounts";
import {Accounts} from "../../../common/apis/Accounts";

interface Props {
    name: string;
    label: string;
    maxLevel?: number;
}
export default function RhfAccountsAutocomplete({ name, label, maxLevel }: Props) {
    const [accountsList, setAccountsList] = React.useState<
        AccountResource[]
    >([]);

    React.useEffect(() => {
        Accounts.getAll({
            orderBy: [{ column: 'name', direction: 'asc' }],
        }).then((res) => setAccountsList(res.data));
    }, [maxLevel]);

    return (
        <RHFAutocomplete
            name={name}
            label={label}
            options={accountsList.map((option) => option) as AccountResource[]}
            getOptionLabel={(option) => (typeof option === 'string' ? option : titleCase(option.name))}
            fullWidth
            renderOption={(props, option) => (
                <li {...props} key={option.account_number}>
                    {titleCase(option.name)}
                </li>
            )}
        />
    );
}
