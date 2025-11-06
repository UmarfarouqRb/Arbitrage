import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Button, Box, Text, useToast } from '@chakra-ui/react';
import { arbitrageBalancerABI } from '../constants'; // Assuming you have this ABI

const ContractControls = ({ contractAddress }) => {
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const handlePause = async () => {
        setIsLoading(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(contractAddress, arbitrageBalancerABI, signer);

            const tx = await contract.pause();
            await tx.wait();

            toast({
                title: 'Contract Paused',
                description: "The contract has been successfully paused.",
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error Pausing Contract',
                description: error.message,
                status: 'error',
                duration: 9000,
                isClosable: true,
            });
        }
        setIsLoading(false);
    };

    const handleUnpause = async () => {
        setIsLoading(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(contractAddress, arbitrageBalancerABI, signer);

            const tx = await contract.unpause();
            await tx.wait();

            toast({
                title: 'Contract Unpaused',
                description: "The contract has been successfully unpaused.",
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error Unpausing Contract',
                description: error.message,
                status: 'error',
                duration: 9000,
                isClosable: true,
            });
        }
        setIsLoading(false);
    };

    return (
        <Box mt={8} p={5} shadow='md' borderWidth='1px'>
            <Text fontSize='xl' mb={4}>Contract Controls</Text>
            <Button onClick={handlePause} isLoading={isLoading} colorScheme='red' mr={4}>
                Pause
            </Button>
            <Button onClick={handleUnpause} isLoading={isLoading} colorScheme='green'>
                Unpause
            </Button>
        </Box>
    );
};

export default ContractControls;
