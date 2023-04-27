import Scrollbar from "components/scrollbar/Scrollbar";
import {Divider, Stack, Typography} from "@mui/material";
import {fCurrency} from "utils/formatNumber";
import {useTheme} from "@mui/material/styles";

type Props = {
    'initialBalance': number,
    'totalCredits': number,
    'totalDebits': number,
    'finalBalance': number,
}
export default function TransactionsListTableBalance({initialBalance, totalCredits, totalDebits, finalBalance}: Props) {
    const theme = useTheme();

    return (
        <Scrollbar>
            <Stack
                direction="row"
                divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
                sx={{ py: 2 }}
                justifyContent="space-evenly"
            >
                <Stack spacing={0.5} alignItems="center">
                    <Typography variant="h6">Initial Balance</Typography>
                    <Typography variant="subtitle1" sx={{ color: theme.palette.primary.main }}>
                        {fCurrency(initialBalance)}
                    </Typography>
                </Stack>

                <Stack spacing={0.5} alignItems="center">
                    <Typography variant="h6">Credits</Typography>
                    <Typography variant="subtitle1" sx={{ color: theme.palette.success.main }}>
                        {fCurrency(totalCredits)}
                    </Typography>
                </Stack>

                <Stack spacing={0.5} alignItems="center">
                    <Typography variant="h6">Debits</Typography>

                    <Typography variant="subtitle1" sx={{ color: theme.palette.error.main }}>
                        {fCurrency(totalDebits)}
                    </Typography>
                </Stack>

                <Stack spacing={0.5} alignItems="center">
                    <Typography variant="h6">Final Balance</Typography>

                    <Typography variant="subtitle1" sx={{ color: theme.palette.primary.main }}>
                        {fCurrency(finalBalance)}
                    </Typography>
                </Stack>

            </Stack>
        </Scrollbar>
    );
}
