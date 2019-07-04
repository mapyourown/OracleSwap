import C from '../basics/Colors'
import {Box} from '@rebass/grid'
import React from 'react'
import Styled from 'styled-components'

const Table = Styled.table`
    margin-left: -30px;
    & tr td:first-child {
        color: ${C}
    }
    & tr {
        padding: 12px 30px;
    }
    & td {
        padding: 7px 30px;
    }
`

/*
    # Indicator A
    This components displays a value
*/
export default
    ({columns, rows, ...props}) =>
        <Box {...props}>
          <Table>
            <tbody>
                <tr>
                    <th></th>
                    {columns.map((column, index) => <th key={index}>{column}</th>)}
                </tr>
                {rows.map((row, rindex) =>
                    <tr key={rindex}>
                        {row.map((field, index) => <td key={index}>{field}</td>)}
                    </tr>
                )}
            </tbody>
        </Table>
       </Box>