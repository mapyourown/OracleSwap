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
            <Flex justifyContent="space-between" width="350px"> 
                <Box width={1/4}><Text size="14px">{fields[1]}</Text></Box>
                <Box width={1/4}><Text size="14px">{fields[2]}</Text></Box>
                <Box width={1/4}><Text size="14px">{fields[3]}</Text></Box>
                <Box width={1/4}><Text size="14px">{fields[4]}</Text></Box>
            </Flex>
        </Flex>