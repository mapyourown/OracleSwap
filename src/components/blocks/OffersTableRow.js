import {D} from '../basics/Colors'
import {Box, Flex} from '@rebass/grid'
import React from 'react'
import Text from '../basics/Text'
import Button from '../basics/Button'

export default
    ({fields, onTakeFromThisLP, onOpenLP}) =>
        <Flex
        alignItems="center"
        pt="10px"
        pb="14px"
        style={{
            borderBottom: `thin solid ${D}`
        }}>
            <Box width="calc(100% - 600px)">
                <Text size="14px" transform="uppercase">{fields[0]}</Text>
                <Box mt="10px">
                    <Button margin="10px" onClick={onOpenLP}>Open LP</Button>
                    <Button onClick={onTakeFromThisLP}>Take from this LP</Button>
                </Box>
            </Box>
            <Flex justifyContent="space-between" width="450px"> 
                <Box width={1/5}><Text size="14px">{fields[1] + " Ξ"} </Text></Box>
                <Box width={1/5}><Text size="14px">{fields[2] + " Ξ"}</Text></Box>
                <Box width={1/5}><Text size="14px">{fields[3] + " Ξ"}</Text></Box>
                <Box width={1/5}><Text size="14px">{fields[4] + " Ξ"}</Text></Box>
                <Box width={1/5}><Text size="14px">{(fields[4] - fields[3])/2 + Math.abs(fields[2] - fields[1])  + " Ξ"}</Text></Box>
            </Flex>
        </Flex>