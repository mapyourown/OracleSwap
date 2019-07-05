import {D} from '../basics/Colors'
import {Box, Flex} from '@rebass/grid'
import React from 'react'
import Text from '../basics/Text'
import Triangle from '../basics/Triangle'
import Styled from 'styled-components'

const Field = Styled(Box)`
    cursor: pointer;
    user-select: none;
`

export default ({order: [by, asc], setOrder}) =>
        <Flex
        pb="10px"
        style={{
            borderBottom: `thin solid ${D}`
        }}>
            <Box width="calc(100% - 600px)" alignItems="flex-end" pt="20px">
                <Text size="14px">Liquidity Provider</Text>
            </Box>
            <Box width="450px">
                <Box mb="7px"><Text>Current Balance</Text><br/></Box>                
                <Flex>
                    <Field width={1/5} onClick={() => setOrder(3, !asc)}><Text size="14px">Long</Text> {by == 3 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                    <Field width={1/5} onClick={() => setOrder(4, !asc)}><Text size="14px">Short</Text> {by == 4 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                    <Field width={1/5} onClick={() => setOrder(5, !asc)}><Text size="14px">Required</Text><br/><Text size="14px">Margin</Text> {by == 5 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                    <Field width={1/5} onClick={() => setOrder(6, !asc)}><Text size="14px">Actual</Text><br/><Text size="14px">Margin</Text> {by == 6 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                    <Field width={1/5} onClick={() => setOrder(6, !asc)}><Text size="14px">Max</Text><br/><Text size="14px">Take</Text> {by == 6 ? <Triangle rotation={!asc ? "180deg" : ""} scale="0.8" fill color="white"/> : null}</Field>
                </Flex>
            </Box>
        </Flex>