import {A, C, D} from '../basics/Colors'
import {Box, Flex} from '@rebass/grid'
import React from 'react'
import Text from '../basics/Text'
import LabeledText from '../basics/LabeledText'
import Button from '../basics/Button'

/*
    # Indicator A
    This components displays a value
*/
export default
    ({fields, onOpenDetail}) =>
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
            width="calc((100% - 150px)*0.6)"
            ml="20px"
            style={{
                overflow: "hidden"
            }}>
                <Box mb="3px"><Text size="13px" transform="uppercase" spacing="1px">{fields.address}</Text></Box>
                <Box><LabeledText label="Subcontract ID" text={fields.bookAdress}/></Box>
            </Box>
            <Flex mt="-8px" width="calc((100% - 150px)*0.6)" justifyContent="space-between"> 
                <Box width={5/20} mr="5px"><LabeledText big label="Req. Margin" text={fields.marginRate + " Ξ"}/></Box>
                <Box width={4/10}><LabeledText big label="Taker Actual Margin" text={fields.takerMargin + " Ξ"}/></Box>
                <Box width={3/20}><LabeledText big label="Canceled" text={fields.canceled ? "Yes" : "No"}/></Box>
                <Box width={3/20}><LabeledText big label="Burned" text={fields.burned ? "Yes" : "No"}/></Box>
                <Box width={3/20}><LabeledText big label="LP Side" text={fields.burned ? "Long" : "Short"}/></Box>
            </Flex>
        </Flex>