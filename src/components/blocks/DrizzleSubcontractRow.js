import {A, C, D} from '../basics/Colors'
import {Box, Flex} from '@rebass/grid'
import React from 'react'
import Text from '../basics/Text'
import LabeledText from '../basics/LabeledText'
import TruncatedAddress from '../basics/TruncatedAddress'
import Button from '../basics/Button'

/*
    # Indicator A
    This components displays a value
*/
export default
    ({id, fields, onOpenDetail}) =>
        <Flex
        alignItems="center"
        pt="10px"
        pb="14px"
        style={{
            borderBottom: `thin solid ${D}`,
        }}>
            <Box width="150px">
                <Button onClick={onOpenDetail}>Open detail</Button>
            </Box>
            <Box
            width="calc((100% - 150px)*0.3)"
            ml="20px"
            style={{
                overflow: "hidden"
            }}>
                <Box mb="3px"><Text size="13px" transform="uppercase" spacing="1px">{fields.address}</Text></Box>
                <Box><TruncatedAddress label="Subcontract ID" addr={id} start="8" end="6" transform="uppercase" spacing="1px"/></Box>
            </Box>
            <Flex mt="-8px" width="calc((100% - 150px)*0.8)" justifyContent="space-between"> 
                <Box width={5/20} mr="5px"><LabeledText big label="Req. Margin" text={fields.reqMargin/1e18 + " Ξ"}/></Box>
                <Box width={4/10}><LabeledText big label="Taker Actual Margin" text={(fields.takerMargin/1e18).toFixed(3) + " Ξ"}/></Box>
                <Box width={4/20}><LabeledText big label="Cancelled" text={fields.isCancelled ? "Yes" : "No"}/></Box>
                <Box width={3/20}><LabeledText big label="Burned" text={fields.isBurned ? "Yes" : "No"}/></Box>
                <Box width={5/20}><LabeledText big label="Taker Side" text={!fields.side ? "Long" : "Short"}/></Box>
                <Box width={6/20}><LabeledText big label="Can be redeemed?" text={fields.toDelete ? "Yes" : "No"}/></Box>
            </Flex>
        </Flex>